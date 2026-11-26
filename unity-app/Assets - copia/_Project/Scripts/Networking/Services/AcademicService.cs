using System.Collections.Generic;
using System.Threading.Tasks;

public class AcademicService
{
    private readonly ApiClient apiClient;

    public AcademicService(ApiClient apiClient)
    {
        this.apiClient = apiClient;
    }

    public Task<List<InstitutionDTO>> GetInstitutionsAsync() =>
        apiClient.GetAsync<List<InstitutionDTO>>("/public/institutions");

    public Task<List<CareerDTO>> GetCareersAsync(int institutionId) =>
        apiClient.GetAsync<List<CareerDTO>>($"/public/institutions/{institutionId}/careers");

    public Task<List<CourseDTO>> GetCoursesAsync(int careerId) =>
        apiClient.GetAsync<List<CourseDTO>>($"/public/careers/{careerId}/courses");
}