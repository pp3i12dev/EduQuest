using UnityEngine;

public class SessionManager
{
    public string Token { get; private set; }
    public UserDTO CurrentUser { get; private set; }
    public bool IsLoggedIn => !string.IsNullOrEmpty(Token);

    public void SetSession(string token, UserDTO user)
    {
        Token = token;
        CurrentUser = user;
        PlayerPrefs.SetString("auth_token", token);
        PlayerPrefs.Save();
    }

    public void ClearSession()
    {
        Token = null;
        CurrentUser = null;
        PlayerPrefs.DeleteKey("auth_token");
    }
}