using System;
using System.IO;
using System.Text;
using UnityEngine;

namespace EduQuest.Student
{
    /// <summary>
    /// Lecturas descargadas ÚNICAMENTE después de validar el JWT en el backend.
    /// Android 10+ usa MediaStore/Downloads (sin permisos de almacenamiento global)
    /// para que el alumno pueda acceder al documento con un visor instalado.
    /// El visor no recibe URLs con tokens.
    /// </summary>
    public static class StudyMaterialFileAccess
    {
        private static string SafeFileName(StudyMaterialDTO material)
        {
            var name = material.filename;
            if (string.IsNullOrWhiteSpace(name)) name = material.title;
            if (string.IsNullOrWhiteSpace(name)) name = "Material";
            var builder = new StringBuilder();
            foreach (var ch in name)
                builder.Append(char.IsLetterOrDigit(ch) || ch == '.' || ch == '_' || ch == '-' || ch == ' ' ? ch : '_');
            var cleaned = builder.ToString().Trim(' ', '.');
            if (cleaned.Length > 90) cleaned = cleaned.Substring(cleaned.Length - 90);
            string ext = Path.GetExtension(cleaned).ToLowerInvariant();
            if (ext != ".pdf" && ext != ".doc" && ext != ".docx")
            {
                string type = (material.mimeType ?? "").ToLowerInvariant();
                ext = type.Contains("pdf") ? ".pdf" : type.Contains("wordprocessingml") ? ".docx" : ".doc";
                cleaned += ext;
            }
            return material.id + "_" + cleaned;
        }

        public static string SaveAndOpen(StudyMaterialDTO material, byte[] data)
        {
            if (material == null || data == null || data.Length == 0)
                throw new Exception("No se recibió el material de estudio.");
            // Copia privada para acceso de la app; nunca se guarda el token de acceso.
            string folder = Path.Combine(Application.persistentDataPath, "EduQuest", "Lecturas");
            Directory.CreateDirectory(folder);
            string name = SafeFileName(material);
            string localPath = Path.Combine(folder, name);
            File.WriteAllBytes(localPath, data);
#if UNITY_ANDROID && !UNITY_EDITOR
            return SaveToAndroidDownloads(name, material.mimeType, data);
#else
            try
            {
                Application.OpenURL(new Uri(localPath).AbsoluteUri);
                return "Documento descargado y enviado al visor. Copia guardada en: " + localPath;
            }
            catch (Exception)
            {
                return "Material descargado en: " + localPath + ". Podés abrirlo con un visor de PDF o Word.";
            }
#endif
        }

#if UNITY_ANDROID && !UNITY_EDITOR
        private static string SaveToAndroidDownloads(string name, string mime, byte[] bytes)
        {
            // MediaStore Downloads está disponible desde Android 10 (API 29).
            using (var version = new AndroidJavaClass("android.os.Build$VERSION"))
            {
                if (version.GetStatic<int>("SDK_INT") < 29)
                    return "El material se descargó dentro de EduQuest. Para exportarlo en Android 9 o anterior se necesita un complemento de almacenamiento.";
            }
            AndroidJavaObject uri = null;
            using (var player = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
            using (var activity = player.GetStatic<AndroidJavaObject>("currentActivity"))
            using (var resolver = activity.Call<AndroidJavaObject>("getContentResolver"))
            using (var collection = new AndroidJavaClass("android.provider.MediaStore$Downloads"))
            using (var collectionUri = collection.GetStatic<AndroidJavaObject>("EXTERNAL_CONTENT_URI"))
            using (var values = new AndroidJavaObject("android.content.ContentValues"))
            {
                values.Call("put", "_display_name", name);
                values.Call("put", "mime_type", string.IsNullOrWhiteSpace(mime) ? "application/octet-stream" : mime);
                values.Call("put", "relative_path", "Download/EduQuest");
                uri = resolver.Call<AndroidJavaObject>("insert", collectionUri, values);
                if (uri == null) throw new Exception("Android no pudo guardar el documento en Descargas.");
                try
                {
                    using (var stream = resolver.Call<AndroidJavaObject>("openOutputStream", uri))
                    {
                        if (stream == null) throw new Exception("No se pudo escribir el archivo en Descargas.");
                        stream.Call("write", (object)bytes);
                        stream.Call("flush");
                        stream.Call("close");
                    }
                    try
                    {
                        using (var intent = new AndroidJavaObject("android.content.Intent", "android.intent.action.VIEW"))
                        {
                            intent.Call<AndroidJavaObject>("setDataAndType", uri,
                                string.IsNullOrWhiteSpace(mime) ? "application/octet-stream" : mime);
                            intent.Call<AndroidJavaObject>("addFlags", 1); // permiso lectura URI
                            activity.Call("startActivity", intent);
                        }
                        return "Documento guardado en Descargas/EduQuest y abierto en el visor.";
                    }
                    catch (AndroidJavaException)
                    {
                        return "Documento guardado en Descargas/EduQuest. Abrilo desde Archivos con un visor PDF o Word.";
                    }
                }
                catch
                {
                    resolver.Call<int>("delete", uri, (string)null, (string[])null);
                    throw;
                }
                finally { uri.Dispose(); }
            }
        }
#endif
    }
}
