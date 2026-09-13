using System.Threading.Tasks;

public class AuthService
{
    private readonly ApiClient apiClient;
    private readonly SessionManager sessionManager;

    public AuthService(ApiClient apiClient, SessionManager sessionManager)
    {
        this.apiClient = apiClient;
        this.sessionManager = sessionManager;
    }

    public async Task<ServiceResult<LoginResponseDTO>> LoginAsync(LoginRequestDTO request)
    {
        try
        {
            var response = await apiClient.PostAsync<LoginRequestDTO, LoginResponseDTO>("/auth/login", request);
            sessionManager.SetSession(response.token, response.user);
            return ServiceResult<LoginResponseDTO>.Ok(response);
        }
        catch (ApiException ex)
        {
            return ServiceResult<LoginResponseDTO>.Fail(ex.Message);
        }
    }

    public async Task<ServiceResult<RegisterStudentResponseDTO>> RegisterStudentAsync(RegisterStudentRequestDTO request)
    {
        try
        {
            var response = await apiClient.PostAsync<RegisterStudentRequestDTO, RegisterStudentResponseDTO>(
                "/auth/register-student", request
            );
            return ServiceResult<RegisterStudentResponseDTO>.Ok(response);
        }
        catch (ApiException ex)
        {
            return ServiceResult<RegisterStudentResponseDTO>.Fail(ex.Message);
        }
    }
}