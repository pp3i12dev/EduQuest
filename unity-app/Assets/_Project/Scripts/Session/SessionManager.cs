using UnityEngine;

// JWT únicamente en memoria; NO persistimos tokens en PlayerPrefs.
public class SessionManager
{
    public string Token { get; private set; }
    public UserDTO CurrentUser { get; private set; }
    public bool IsLoggedIn => !string.IsNullOrWhiteSpace(Token);
    public void SetSession(string token, UserDTO user) { Token = token; CurrentUser = user; }
    public void ClearSession() { Token = null; CurrentUser = null; }
    public bool IsStudent()
    {
        if (CurrentUser?.roles == null) return false;
        foreach (string role in CurrentUser.roles)
            if (string.Equals(role, "STUDENT", System.StringComparison.OrdinalIgnoreCase)) return true;
        return false;
    }
}
