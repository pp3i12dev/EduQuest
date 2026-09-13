using UnityEngine;
using UnityEngine.SceneManagement;

public class mensajeUsuario : MonoBehaviour
{
   public void Menu()
    {

        SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex -2);

    }
}
