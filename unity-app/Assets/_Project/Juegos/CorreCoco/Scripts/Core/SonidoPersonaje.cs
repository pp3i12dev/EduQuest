using UnityEngine;

/// <summary>
/// Maneja los efectos de sonido del personaje. Requiere 2 componentes AudioSource
/// en el mismo GameObject "Jugador":
/// - audioLoop: Loop = true, para el sonido de correr (continuo).
/// - audioSFX: Loop = false, para sonidos puntuales (salto).
/// </summary>
public class SonidoPersonaje : MonoBehaviour
{
    [Header("Fuentes de audio (2 AudioSource distintos en el Inspector)")]
    [SerializeField] private AudioSource audioLoop;
    [SerializeField] private AudioSource audioSFX;

    [Header("Clips")]
    [SerializeField] private AudioClip clipCorrer;
    [SerializeField] private AudioClip clipSalto;

    private void Start()
    {
        if (audioLoop != null && clipCorrer != null)
        {
            audioLoop.clip = clipCorrer;
            audioLoop.loop = true;
            audioLoop.Play();
        }
    }

    private void OnEnable()
    {
        if (GameManager.Instancia == null) return;
        // GameManager.Instancia.OnPreguntaAbierta += PausarLoop;
        // GameManager.Instancia.OnPreguntaCerrada += ReanudarLoop;
    }

    private void OnDisable()
    {
        if (GameManager.Instancia == null) return;
        // GameManager.Instancia.OnPreguntaAbierta -= PausarLoop;
        // GameManager.Instancia.OnPreguntaCerrada -= ReanudarLoop;
    }

    private void PausarLoop() => audioLoop?.Pause();
    private void ReanudarLoop() => audioLoop?.UnPause();

    /// <summary>Llamar desde un Animation Event en el clip Anim_Saltar</summary>
    public void ReproducirSonidoSalto()
    {
        if (audioSFX != null && clipSalto != null)
            audioSFX.PlayOneShot(clipSalto);
    }
}