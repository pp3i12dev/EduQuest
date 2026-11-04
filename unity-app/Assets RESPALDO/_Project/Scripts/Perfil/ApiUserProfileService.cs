using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace QuestLearn.Perfil
{
    /// <summary>
    /// Implementación real: consulta GET /api/usuarios/me contra tu backend.
    /// Necesita un MonoBehaviour activo para correr la coroutine (usá esta misma clase
    /// como componente en un GameObject, o inyectá un runner desde afuera).
    /// </summary>
    public class ApiUserProfileService : MonoBehaviour, IUserProfileService
    {
        [SerializeField] private string baseUrl = "https://tuapi.colegio.edu.ar";
        [SerializeField] private string endpoint = "/api/usuarios/me";

        public void GetMyProfile(Action<UserProfileData> onSuccess, Action<string> onError)
        {
            StartCoroutine(GetMyProfileRoutine(onSuccess, onError));
        }

        private IEnumerator GetMyProfileRoutine(Action<UserProfileData> onSuccess, Action<string> onError)
        {
            string url = baseUrl + endpoint;

            using (UnityWebRequest request = UnityWebRequest.Get(url))
            {
                // Agregá tu token de sesión acá:
                // request.SetRequestHeader("Authorization", "Bearer " + SessionManager.Token);

                yield return request.SendWebRequest();

                if (request.result != UnityWebRequest.Result.Success)
                {
                    onError?.Invoke("No se pudo conectar con el servidor. Verificá tu conexión e intentá de nuevo.");
                    yield break;
                }

                try
                {
                    var data = JsonUtility.FromJson<UserProfileData>(request.downloadHandler.text);
                    onSuccess?.Invoke(data);
                }
                catch (Exception)
                {
                    onError?.Invoke("Los datos recibidos no tienen el formato esperado.");
                }
            }
        }
    }
}
