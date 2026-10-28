using System.Threading.Tasks;

public class ActivityService
{
    private readonly ApiClient apiClient;

    public ActivityService(ApiClient apiClient)
    {
        this.apiClient = apiClient;
    }

    public async Task<CreateQuizResponseDTO> CreateQuizAsync(CreateQuizRequestDTO request)
    {
        try
        {
            return await apiClient.PostAsync<CreateQuizRequestDTO, CreateQuizResponseDTO>(
                "/activities/quiz",
                request
            );
        }
        catch (ApiException ex)
        {
            return new CreateQuizResponseDTO
            {
                success = false,
                message = ex.Message
            };
        }
    }
}
