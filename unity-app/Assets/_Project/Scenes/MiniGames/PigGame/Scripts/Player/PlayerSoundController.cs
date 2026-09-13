using UnityEngine;
using UnityEngine.SceneManagement;

public class PlayerSoundController : MonoBehaviour
{
    public AudioSource audioSource;
    public AudioClip sonidoSaltar;
    public AudioClip sonidoMoneda;
    public AudioClip sonidoMuerte;
    public AudioClip sonidoPinches;

    private void OnEnable()
    {
        
        SceneManager.activeSceneChanged += OnSceneChanged;
    }

    private void OnDisable()
    {
        SceneManager.activeSceneChanged -= OnSceneChanged;
    }

  
    private void OnSceneChanged(Scene escenaAnterior, Scene escenaNueva)
    {
     
        foreach (var audio in FindObjectsOfType<AudioSource>())
        {
            // Evitar cortar sonidos del jugador (solo música de fondo)
            if (audio != null && audio.loop && audio.isPlaying)
            {
                audio.Stop();
            }
        }
    }

    public void playSaltar() => audioSource.PlayOneShot(sonidoSaltar);
    public void playSonidoMoneda() => audioSource.PlayOneShot(sonidoMoneda);
    public void PlaySonidoMuerte() => audioSource.PlayOneShot(sonidoMuerte);
    public void PlaysonidoPinches() => audioSource.PlayOneShot(sonidoPinches);
}
