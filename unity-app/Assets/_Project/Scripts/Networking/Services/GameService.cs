using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Newtonsoft.Json;
using UnityEngine;

// Servicio de juegos. Registrarlo en Bootstrap.cs:
//   var gameService = new GameService(apiClient);
//   ServiceLocator.Register(gameService);
public class GameService
{
    private const string PendingKey = "vf_pending_results";
    private const int TimeoutMs = 10000;
    private const int MaxRetries = 5;

    private readonly ApiClient apiClient;

    public GameService(ApiClient apiClient)
    {
        this.apiClient = apiClient;
    }

    public Task<TrueFalseGameDTO> GetTrueFalseGameAsync(int activityId) =>
        WithTimeout(apiClient.GetAsync<TrueFalseGameDTO>($"/games/true-false/{activityId}"));

    // Envía resultados. Si falla (500, timeout, sin señal) los guarda en caché y devuelve Fail.
    public async Task<ServiceResult<TrueFalseResultsResponseDTO>> SubmitTrueFalseResultsAsync(
        int activityId, TrueFalseResultsRequestDTO request)
    {
        try
        {
            var response = await WithTimeout(
                apiClient.PostAsync<TrueFalseResultsRequestDTO, TrueFalseResultsResponseDTO>(
                    $"/games/true-false/{activityId}/results", request));
            return ServiceResult<TrueFalseResultsResponseDTO>.Ok(response);
        }
        catch (Exception ex)
        {
            Debug.LogWarning($"[GameService] Falló el envío, se guarda en caché: {ex.Message}");
            SavePending(activityId, request);
            return ServiceResult<TrueFalseResultsResponseDTO>.Fail(ex.Message);
        }
    }

    // Llamar al entrar al menú/juego: reintenta lo que quedó pendiente.
    public async Task RetryPendingAsync()
    {
        if (Application.internetReachability == NetworkReachability.NotReachable) return;

        var pending = LoadPending();
        if (pending.Count == 0) return;

        var stillPending = new List<PendingTrueFalseResult>();
        foreach (var item in pending)
        {
            try
            {
                await WithTimeout(apiClient.PostAsync<TrueFalseResultsRequestDTO, TrueFalseResultsResponseDTO>(
                    $"/games/true-false/{item.activityId}/results", item.request));
            }
            catch
            {
                item.retries++;
                if (item.retries < MaxRetries) stillPending.Add(item);   // evita reintentar para siempre un 400
            }
        }
        StorePending(stillPending);
    }

    // ---------- helpers ----------

    // ApiClient no define timeout; lo resolvemos acá sin tocar ese archivo compartido.
    private static async Task<T> WithTimeout<T>(Task<T> task)
    {
        var finished = await Task.WhenAny(task, Task.Delay(TimeoutMs));
        if (finished != task) throw new TimeoutException("Tiempo de espera agotado");
        return await task;
    }

    private void SavePending(int activityId, TrueFalseResultsRequestDTO request)
    {
        var pending = LoadPending();
        if (pending.Exists(p => p.request.partidaId == request.partidaId)) return;
        pending.Add(new PendingTrueFalseResult { activityId = activityId, request = request });
        StorePending(pending);
    }

    private static List<PendingTrueFalseResult> LoadPending()
    {
        var raw = PlayerPrefs.GetString(PendingKey, "");
        if (string.IsNullOrEmpty(raw)) return new List<PendingTrueFalseResult>();
        try { return JsonConvert.DeserializeObject<List<PendingTrueFalseResult>>(raw) ?? new(); }
        catch { return new List<PendingTrueFalseResult>(); }
    }

    private static void StorePending(List<PendingTrueFalseResult> pending)
    {
        PlayerPrefs.SetString(PendingKey, JsonConvert.SerializeObject(pending));
        PlayerPrefs.Save();
    }
}
