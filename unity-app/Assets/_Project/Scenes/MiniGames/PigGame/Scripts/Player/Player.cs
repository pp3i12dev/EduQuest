using TMPro;
using UnityEngine;
using UnityEngine.SceneManagement;

public class PlayerMovement : MonoBehaviour
{
    public PlayerSoundController playersoundcontroller;
    float horizontalMove = 0;

    public float runSpeedHorizontal = 2;
    public float runSpeedVertical = 3;
    public float runSpeed = 1.5f;
    private Animator animator;

    private int coins;
    private int totalCoins;
    public TMP_Text textCoins;

    public float velocidad = 5f;
    public float fuerzaSalto = 6.5f;
    public float longitudRaycast = 0.1f;
    public LayerMask capaSuelo;

    private bool enSuelo;
    private bool isDead = false;

    private Rigidbody2D rb2D;
    public Joystick joystick;

    void Start()
    {
        rb2D = GetComponent<Rigidbody2D>();
        animator = GetComponent<Animator>();
        totalCoins = GameObject.FindGameObjectsWithTag("Coin").Length;
    }

    void Update()
    {
        if (isDead) return;

        horizontalMove = joystick.Horizontal * runSpeedHorizontal;
        rb2D.linearVelocity = new Vector2(horizontalMove * runSpeed, rb2D.linearVelocity.y);

        if (horizontalMove != 0)
            transform.localScale = new Vector3(Mathf.Sign(horizontalMove), 1, 1);

        RaycastHit2D hit = Physics2D.Raycast(transform.position, Vector2.down, longitudRaycast, capaSuelo);
        enSuelo = hit.collider != null;

        animator.SetFloat("Speed", Mathf.Abs(horizontalMove));
        animator.SetFloat("VerticalVelocity", rb2D.linearVelocity.y);
        animator.SetBool("enSuelo", enSuelo);
    }

    public void Jump()
    {
        if (isDead) return;
        if (enSuelo)
        {
            animator.SetTrigger("Jump"); 
            playersoundcontroller.playSaltar();
            rb2D.AddForce(new Vector2(0f, fuerzaSalto), ForceMode2D.Impulse);
        }
    }

    void OnDrawGizmos()
    {
        Gizmos.color = Color.red;
        Gizmos.DrawLine(transform.position, transform.position + Vector3.down * longitudRaycast);
    }

    private void OnTriggerEnter2D(Collider2D collision)
    {
        if (collision.transform.CompareTag("Coin"))
        {
            playersoundcontroller.playSonidoMoneda();
            Destroy(collision.gameObject);
            coins++;
            textCoins.text = coins.ToString();
            if (coins >= totalCoins)
                Invoke("LoadNextScene", 1f);
        }

        if (collision.transform.CompareTag("Spikes") && !isDead)
        {
            isDead = true;
            rb2D.linearVelocity = Vector2.zero;
            playersoundcontroller.PlaysonidoPinches();
            playersoundcontroller.PlaySonidoMuerte();
            StartCoroutine(RestartAfterDeath());
        }
    }

    private System.Collections.IEnumerator RestartAfterDeath()
    {
        float waitTime = 1f;
        if (playersoundcontroller != null && playersoundcontroller.sonidoMuerte != null)
            waitTime = playersoundcontroller.sonidoMuerte.length;
        yield return new WaitForSeconds(waitTime);
        SceneManager.LoadScene(SceneManager.GetActiveScene().name);
    }

    void LoadNextScene()
    {
        int currentSceneIndex = SceneManager.GetActiveScene().buildIndex;
        SceneManager.LoadScene(currentSceneIndex + 1);
    }
}
