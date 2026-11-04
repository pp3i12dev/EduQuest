public class ServiceResult<T>
{
    public bool Success { get; private set; }
    public T Data { get; private set; }
    public string ErrorMessage { get; private set; }

    public static ServiceResult<T> Ok(T data) =>
        new ServiceResult<T> { Success = true, Data = data };

    public static ServiceResult<T> Fail(string errorMessage) =>
        new ServiceResult<T> { Success = false, ErrorMessage = errorMessage };
}