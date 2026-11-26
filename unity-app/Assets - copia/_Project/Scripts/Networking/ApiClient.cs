using System.Text;
using System.Threading.Tasks;
using UnityEngine.Networking;
using Newtonsoft.Json;

// Cliente HTTP compartido por AuthService, AcademicService y StudentGateway.
public class ApiClient
{
    private readonly string baseUrl;
    private readonly SessionManager sessionManager;
    public ApiClient(string baseUrl, SessionManager sessionManager)
    {
        this.baseUrl = baseUrl.TrimEnd('/');
        this.sessionManager = sessionManager;
    }
    public Task<T> GetAsync<T>(string endpoint) => Request<T>("GET", endpoint);
    public Task<TResponse> PostAsync<TRequest, TResponse>(string endpoint, TRequest body) => Request<TResponse>("POST", endpoint, body);
    public Task<TResponse> PatchAsync<TRequest, TResponse>(string endpoint, TRequest body) => Request<TResponse>("PATCH", endpoint, body);
    // Descarga binaria autenticada. No se expone el JWT en URLs externas.
    public async Task<byte[]> GetBytesAsync(string endpoint)
    {
        if (!sessionManager.IsLoggedIn) throw new ApiException("Iniciá sesión para descargar el material.");
        using (var request = UnityWebRequest.Get(baseUrl + endpoint))
        {
            request.timeout = 60;
            request.SetRequestHeader("Authorization", "Bearer " + sessionManager.Token);
            var operation = request.SendWebRequest();
            while (!operation.isDone) await Task.Yield();
            if (request.result != UnityWebRequest.Result.Success)
            {
                string msg = "No se pudo descargar el material";
                try
                {
                    var error = JsonConvert.DeserializeObject<ErrorResponseDTO>(request.downloadHandler.text);
                    if (!string.IsNullOrWhiteSpace(error?.message)) msg = error.message;
                }
                catch (JsonException) { }
                throw new ApiException($"{msg} (HTTP {request.responseCode})");
            }
            var data = request.downloadHandler.data;
            if (data == null || data.Length == 0) throw new ApiException("El archivo descargado está vacío.");
            return data;
        }
    }

    public async Task<T> Request<T>(string method, string endpoint, object body = null)
    {
        using (var request = new UnityWebRequest(baseUrl + endpoint, method))
        {
            request.timeout = 25;
            request.downloadHandler = new DownloadHandlerBuffer();
            if (body != null)
            {
                request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(body)));
                request.SetRequestHeader("Content-Type", "application/json");
            }
            if (sessionManager.IsLoggedIn)
                request.SetRequestHeader("Authorization", "Bearer " + sessionManager.Token);
            var operation = request.SendWebRequest();
            while (!operation.isDone) await Task.Yield();
            if (request.result != UnityWebRequest.Result.Success)
            {
                string msg = request.responseCode == 0 ? "No se pudo conectar con la API. Verificá el servidor y la URL." : "La operación falló";
                try
                {
                    var error = JsonConvert.DeserializeObject<ErrorResponseDTO>(request.downloadHandler.text);
                    if (!string.IsNullOrWhiteSpace(error?.message)) msg = error.message;
                }
                catch (JsonException) { }
                throw new ApiException($"{msg} (HTTP {request.responseCode})");
            }
            if (string.IsNullOrWhiteSpace(request.downloadHandler.text)) return default(T);
            return JsonConvert.DeserializeObject<T>(request.downloadHandler.text);
        }
    }
}
