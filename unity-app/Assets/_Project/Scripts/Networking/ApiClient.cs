using System.Text;
using System.Threading.Tasks;
using UnityEngine.Networking;
using Newtonsoft.Json;

public class ApiClient
{
    private readonly string baseUrl;
    private readonly SessionManager sessionManager;

    public ApiClient(string baseUrl, SessionManager sessionManager)
    {
        this.baseUrl = baseUrl;
        this.sessionManager = sessionManager;
    }

    public async Task<TResponse> GetAsync<TResponse>(string endpoint)
    {
        using var request = UnityWebRequest.Get(baseUrl + endpoint);
        ApplyAuthHeader(request);

        var operation = request.SendWebRequest();
        while (!operation.isDone) await Task.Yield();

        if (request.result != UnityWebRequest.Result.Success)
            throw new ApiException(ExtractErrorMessage(request.downloadHandler.text));

        return JsonConvert.DeserializeObject<TResponse>(request.downloadHandler.text);
    }

    public async Task<TResponse> PostAsync<TRequest, TResponse>(string endpoint, TRequest body)
    {
        string json = JsonConvert.SerializeObject(body);
        byte[] bodyRaw = Encoding.UTF8.GetBytes(json);

        using var request = new UnityWebRequest(baseUrl + endpoint, "POST");
        request.uploadHandler = new UploadHandlerRaw(bodyRaw);
        request.downloadHandler = new DownloadHandlerBuffer();
        request.SetRequestHeader("Content-Type", "application/json");
        ApplyAuthHeader(request);

        var operation = request.SendWebRequest();
        while (!operation.isDone) await Task.Yield();

        if (request.result != UnityWebRequest.Result.Success)
            throw new ApiException(ExtractErrorMessage(request.downloadHandler.text));

        return JsonConvert.DeserializeObject<TResponse>(request.downloadHandler.text);
    }

    private void ApplyAuthHeader(UnityWebRequest request)
    {
        if (sessionManager.IsLoggedIn)
            request.SetRequestHeader("Authorization", $"Bearer {sessionManager.Token}");
    }

    private string ExtractErrorMessage(string rawJson)
    {
        try
        {
            var error = JsonConvert.DeserializeObject<ErrorResponseDTO>(rawJson);
            return error?.message ?? "Error de conexión";
        }
        catch
        {
            return "Error de conexión";
        }
    }
}