using System;

public class ApiException : Exception
{
    public ApiException(string message) : base(message) { }
}