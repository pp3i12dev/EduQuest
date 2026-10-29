using TMPro;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Pantalla de Resultados (mockup 8 y 9): puntaje, tiempo, aciertos y estrellas.
/// </summary>
public class VFResultsView : MonoBehaviour
{
    [SerializeField] private GameObject panel;
    [SerializeField] private TextMeshProUGUI textoPuntaje;    // "80 / 100"
    [SerializeField] private TextMeshProUGUI textoTiempo;     // "2 min 45 s"
    [SerializeField] private TextMeshProUGUI textoAciertos;   // "8 / 10"
    [SerializeField] private Transform contenedorEstrellas;   // con Horizontal Layout Group
    [SerializeField] private Image prefabEstrella;
    [SerializeField] private Sprite estrellaLlena, estrellaVacia;
    [SerializeField] private int totalEstrellas = 5;
    [SerializeField] private Button botonVolverMenu;
    [SerializeField] private string escenaMenu = "Home";

    private void Awake()
    {
        panel.SetActive(false);
        botonVolverMenu.onClick.AddListener(() =>
        {
            Time.timeScale = 1f;
            SceneLoader.LoadScene(escenaMenu);
        });
    }

    public void Mostrar(TrueFalseResultsResponseDTO r, int segundos)
    {
        textoPuntaje.text = $"{r.score} / {r.maxScore}";
        textoTiempo.text = $"{segundos / 60} min {segundos % 60} s";
        textoAciertos.text = $"{r.hits} / {r.total}";

        foreach (Transform hijo in contenedorEstrellas) Destroy(hijo.gameObject);

        // Regla: 1 estrella cada 20 % (80 % = 4 estrellas). Ajustar si el grupo decide otra.
        int llenas = Mathf.Clamp(Mathf.RoundToInt(r.percentage / 100f * totalEstrellas), 0, totalEstrellas);
        for (int i = 0; i < totalEstrellas; i++)
        {
            var estrella = Instantiate(prefabEstrella, contenedorEstrellas);
            estrella.sprite = i < llenas ? estrellaLlena : estrellaVacia;
        }

        botonVolverMenu.interactable = true;
        panel.SetActive(true);
    }
}
