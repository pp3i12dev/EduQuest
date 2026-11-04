using UnityEngine;

/// <summary>
/// Controla el movimiento del personaje: avance horizontal automático + salto por toque.
/// Compatible con ambos sistemas de Input (Legacy e Input System) y adaptado al Animator Controller existente.
/// </summary>
[RequireComponent(typeof(Rigidbody2D))]
public class PlayerController : MonoBehaviour
{
    [Header("Movimiento horizontal")]
    [SerializeField] private bool movimientoAutomatico = true;
    [SerializeField] private float velocidadHorizontal = 4f;

    [Header("Salto")]
    [SerializeField] private float fuerzaSalto = 3f;
    [Tooltip("Punto vacío ubicado en los pies del personaje, usado para detectar el suelo")]
    [SerializeField] private Transform puntoChequeoSuelo;
    [SerializeField] private float radioChequeoSuelo = 0.15f;
    [SerializeField] private LayerMask capaSuelo;

    [Header("Animación (opcional)")]
    [SerializeField] private Animator animator;

    private Rigidbody2D rb;
    private bool estaEnSuelo;
    private static readonly int HashSaltando = Animator.StringToHash("Saltando");
    private static readonly int HashCorriendo = Animator.StringToHash("Corriendo");

    private void Awake()
    {
        rb = GetComponent<Rigidbody2D>();
    }

    private void Update()
    {
        if (GameManager.Instancia != null && GameManager.Instancia.JuegoPausado)
            return;

        DetectarSuelo();
        LeerInputDeSalto();
        ActualizarProgresoDeNivel();

        if (animator != null)
        {
            animator.SetBool(HashCorriendo, movimientoAutomatico);
        }
    }

    private void FixedUpdate()
    {
        if (GameManager.Instancia != null && GameManager.Instancia.JuegoPausado)
            return;

        if (movimientoAutomatico)
        {
            rb.linearVelocity = new Vector2(velocidadHorizontal, rb.linearVelocity.y);
        }
    }

    private void DetectarSuelo()
    {
        if (puntoChequeoSuelo == null) return;
        estaEnSuelo = Physics2D.OverlapCircle(puntoChequeoSuelo.position, radioChequeoSuelo, capaSuelo);
    }

    private void LeerInputDeSalto()
    {
        bool sePresionoToque = false;

#if ENABLE_INPUT_SYSTEM
        if (UnityEngine.InputSystem.Mouse.current != null && UnityEngine.InputSystem.Mouse.current.leftButton.wasPressedThisFrame)
            sePresionoToque = true;
        if (UnityEngine.InputSystem.Touchscreen.current != null && UnityEngine.InputSystem.Touchscreen.current.primaryTouch.press.wasPressedThisFrame)
            sePresionoToque = true;
#endif

        if (!sePresionoToque)
        {
            try
            {
                sePresionoToque = Input.GetMouseButtonDown(0) || (Input.touchCount > 0 && Input.GetTouch(0).phase == TouchPhase.Began);
            }
            catch
            {
                // Evita excepciones si el gestor clásico está inhabilitado
            }
        }

        if (sePresionoToque && estaEnSuelo)
{
    rb.linearVelocity = new Vector2(rb.linearVelocity.x, 0f);
    rb.AddForce(Vector2.up * fuerzaSalto, ForceMode2D.Impulse);

    if (animator != null)
        animator.SetTrigger(HashSaltando);
}
    }

    private void ActualizarProgresoDeNivel()
    {
        if (GameManager.Instancia != null)
        {
            GameManager.Instancia.ActualizarDistancia(transform.position.x);
        }
    }

    private void OnTriggerEnter2D(Collider2D otro)
    {
        if (otro.CompareTag("ZonaDeCaida"))
        {
            GameManager.Instancia?.PerderVida();
        }
    }

    private void OnDrawGizmosSelected()
    {
        if (puntoChequeoSuelo != null)
        {
            Gizmos.color = Color.red;
            Gizmos.DrawWireSphere(puntoChequeoSuelo.position, radioChequeoSuelo);
        }
    }

}