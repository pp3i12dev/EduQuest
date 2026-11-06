using UnityEngine;
using UnityEngine.UI;
using TMPro;
using UnityEngine.InputSystem;
using System.Collections;              // Para usar corrutinas (IEnumerator)
using System.Text.RegularExpressions;

public class ProfileManager : MonoBehaviour
{
    [Header("UI References")]
    [SerializeField] private TMP_InputField emailInput;
    [SerializeField] private TMP_InputField dniInput;           // Protegido (solo editable por Directivo)
    [SerializeField] private TMP_Dropdown roleDropdown;         // Protegido (solo editable por Directivo)
    [SerializeField] private TMP_InputField newPasswordInput;
    [SerializeField] private TMP_InputField confirmPasswordInput;
    [SerializeField] private Button saveButton;
    [SerializeField] private Button profilePicButton;
    [SerializeField] private TMP_Text passwordFeedbackText;

    // Colores para el feedback visual de contraseñas
    private Color matchColor = new Color(0f, 1f, 0f);     // Verde
    private Color mismatchColor = new Color(1f, 0f, 0f);  // Rojo

    private void Start()
    {
        // Suscripción al evento en tiempo real para validar contraseñas mientras se escribe
        newPasswordInput.onValueChanged.AddListener(OnPasswordChanged);
        confirmPasswordInput.onValueChanged.AddListener(OnPasswordChanged);

        // Limpiar el texto de feedback al iniciar la escena
        passwordFeedbackText.text = "";
    }

    private void Update()
    {
        // Escucha constante para la navegación por teclado (Tab / Shift + Tab)
        HandleTabulation();
    }

    private void OnDestroy()
    {
        // Remover los listeners para evitar fugas de memoria
        newPasswordInput.onValueChanged.RemoveListener(OnPasswordChanged);
        confirmPasswordInput.onValueChanged.RemoveListener(OnPasswordChanged);
    }

    // Validación visual en tiempo real de las contraseñas
    private void OnPasswordChanged(string _)
    {
        string newPass = newPasswordInput.text;
        string confirmPass = confirmPasswordInput.text;

        if (!string.IsNullOrEmpty(newPass) && !string.IsNullOrEmpty(confirmPass))
        {
            if (newPass == confirmPass)
            {
                passwordFeedbackText.text = "✓ Las contraseñas coinciden";
                passwordFeedbackText.color = matchColor;
            }
            else
            {
                passwordFeedbackText.text = "Las contraseñas no coinciden";
                passwordFeedbackText.color = mismatchColor;
            }
        }
        else
        {
            passwordFeedbackText.text = "";
        }
    }

    // Lógica de tabulación
    private void HandleTabulation()
    {
        if (Keyboard.current != null && Keyboard.current.tabKey.wasPressedThisFrame)
        {
            bool shiftHeld = Keyboard.current.leftShiftKey.isPressed || Keyboard.current.rightShiftKey.isPressed;

            Selectable currentSelectable = UnityEngine.EventSystems.EventSystem.current.currentSelectedGameObject?.GetComponent<Selectable>();

            if (currentSelectable != null)
            {
                Selectable nextSelectable = shiftHeld ? FindSelectableUp(currentSelectable) : FindSelectableDown(currentSelectable);

                if (nextSelectable != null)
                {
                    nextSelectable.Select();
                }
            }
            else
            {
                emailInput.Select(); // Foco inicial por defecto
            }
        }
    }

    // Orden de tabulación hacia adelante
    private Selectable FindSelectableDown(Selectable current)
    {
        if (current == emailInput) return dniInput;
        if (current == dniInput) return roleDropdown;
        if (current == roleDropdown) return newPasswordInput;
        if (current == newPasswordInput) return confirmPasswordInput;
        if (current == confirmPasswordInput) return saveButton;
        if (current == saveButton) return emailInput;

        return null;
    }

    // Orden de tabulación hacia atrás (Shift + Tab)
    private Selectable FindSelectableUp(Selectable current)
    {
        if (current == emailInput) return saveButton;
        if (current == saveButton) return confirmPasswordInput;
        if (current == confirmPasswordInput) return newPasswordInput;
        if (current == newPasswordInput) return roleDropdown;
        if (current == roleDropdown) return dniInput;
        if (current == dniInput) return emailInput;

        return null;
    }

    // Método principal vinculado al botón "Guardar cambios" en el Inspector
    public void OnSaveClicked()
    {
        string email = emailInput.text;
        string pattern = @"^[^@\s]+@[^@\s]+\.[^@\s]+$";

        // 1. Validación de formato de correo electrónico mediante Expresiones Regulares
        if (!Regex.IsMatch(email, pattern))
        {
            Debug.LogWarning("Formato de correo inválido");
            passwordFeedbackText.text = "Formato de correo inválido";
            passwordFeedbackText.color = mismatchColor;
            return;
        }

        // 2. Validación de contraseñas vacías o desparejas
        if (newPasswordInput.text != confirmPasswordInput.text || string.IsNullOrEmpty(newPasswordInput.text))
        {
            Debug.LogWarning("Las contraseñas no coinciden o están vacías");
            passwordFeedbackText.text = "Las contraseñas no coinciden o están vacías";
            passwordFeedbackText.color = mismatchColor;
            return;
        }

        // 3. Bloqueo temporal del botón para evitar múltiples envíos simultáneos
        saveButton.interactable = false;

        // 4. Ejecución del flujo asíncrono (Sincronización)
        StartCoroutine(MockSyncWithBackend(email, newPasswordInput.text));
    }

    /*
     * =========================================================================
     * GUÍA TÉCNICA: CÓMO REEMPLAZAR ESTE MOCK POR EL BACKEND REAL EN EL FUTURO
     * =========================================================================
     * Cuando el equipo de backend tenga listos los endpoints en la nube 
     * (PostgreSQL/Neon), deberás modificar UNICAMENTE este método corrutina:
     * 
     * 1. Eliminar el "yield return new WaitForSeconds(2f);".
     * 2. Implementar una petición HTTP (por ejemplo usando UnityWebRequest):
     *    - Crear el objeto UnityWebRequest apuntando a la URL del backend (ej: /api/profile/update).
     *    - Enviar los datos serializados en JSON (correo, nueva contraseña).
     *    - Esperar la respuesta con un yield return request.SendWebRequest().
     * 3. Evaluar si request.result == UnityWebRequest.Result.Success para dar por 
     *    válido el guardado, o manejar el error devuelto por el servidor.
     * =========================================================================
     */
    private IEnumerator MockSyncWithBackend(string email, string newPassword)
    {
        // Simulación temporal de latencia de red hacia la nube (2 segundos)
        yield return new WaitForSeconds(2f);

        bool isSuccess = true; // Simulación de respuesta HTTP 200 OK del servidor

        if (isSuccess)
        {
            Debug.Log($"[Mock Backend] Datos sincronizados para {email}. Nueva clave guardada en la nube.");

            // Limpieza de inputs sensibles y feedback visual de éxito
            newPasswordInput.text = "";
            confirmPasswordInput.text = "";
            passwordFeedbackText.text = "¡Cambios guardados con éxito!";
            passwordFeedbackText.color = matchColor;
        }
        else
        {
            Debug.LogError("Error al conectar con el servidor.");
            passwordFeedbackText.text = "Error de conexión con el servidor";
            passwordFeedbackText.color = mismatchColor;
        }

        // Reactivación del botón para permitir futuras interacciones
        saveButton.interactable = true;
    }
}