using System;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

[ExecuteAlways]
public class HeadAccessoryPreview : MonoBehaviour
{
    [Serializable]
    public struct AccessoryOption
    {
        public string id;
        public Sprite sprite;
        public int price;
        public bool unlockedByDefault;
        public Vector3 localOffset;
        public Vector3 localEulerAngles;
        public Vector3 localScale;
    }

    [Header("Anclaje en el hueso de la cabeza")]
    [SerializeField] private SpriteRenderer accessoryRenderer;

    [Header("Simulación de monedas (opcional)")]
    [SerializeField] private SimulatedCoinWallet coinWallet;
    [SerializeField] private TMP_Text statusLabel;

    [Header("UI del selector")]
    [SerializeField] private GameObject panelRoot;
    [SerializeField] private Transform gridContainer;
    [SerializeField] private Button optionButtonPrefab;
    [SerializeField] private Button applyButton;
    [SerializeField] private Button closeButton;

    [Header("Catálogo de prueba")]
    [SerializeField] private List<AccessoryOption> accessories = new();

    [Header("Vista previa en Editor (sin Play)")]
    [SerializeField] private int previewInEditorIndex = -1;

    private int _appliedIndex = -1;
    private int _previewIndex = -1;
    private float _previousTimeScale = 1f;
    private bool _isPausedByPanel;

    private void Awake()
    {
        if (!Application.isPlaying) return;

        if (applyButton != null)
            applyButton.onClick.AddListener(ApplySelection);

        if (closeButton != null)
            closeButton.onClick.AddListener(CancelAndClose);

        BuildButtons();
        ApplyIndex(_appliedIndex);
        SetStatus("");

        if (panelRoot != null)
            panelRoot.SetActive(false);
    }

    private void OnValidate()
    {
        if (Application.isPlaying) return;
        ApplyIndex(previewInEditorIndex);
    }

    private void LateUpdate()
    {
        if (!Application.isPlaying) return;
        if (Time.timeScale <= 0f) return;

        int activeIndex = (panelRoot != null && panelRoot.activeSelf) ? _previewIndex : _appliedIndex;
        ApplyIndex(activeIndex);
    }

    private void OnDestroy()
    {
        if (!Application.isPlaying) return;

        ResumeGameTime();

        if (applyButton != null)
            applyButton.onClick.RemoveListener(ApplySelection);

        if (closeButton != null)
            closeButton.onClick.RemoveListener(CancelAndClose);
    }

    public void OpenPanel()
    {
        _previewIndex = _appliedIndex;
        ApplyIndex(_previewIndex);
        RefreshButtonsVisuals();
        SetStatus("");

        if (panelRoot != null)
            panelRoot.SetActive(true);

        PauseGameTime();
    }

    public void OnOptionClicked(int index)
    {
        if (index < -1 || index >= accessories.Count) return;

        // -1 representa "Sin accesorio", siempre disponible
        if (index == -1)
        {
            _previewIndex = -1;
            ApplyIndex(-1);
            SetStatus("Sin accesorio seleccionado. Tocá Aplicar para confirmar.");
            return;
        }

        AccessoryOption item = accessories[index];

        // Si ya está desbloqueado, permite previsualizarlo sin cobrar
        if (IsItemUnlocked(index, item))
        {
            _previewIndex = index;
            ApplyIndex(index);
            SetStatus($"Vista previa: {GetItemLabel(index, item)} (Desbloqueado)");
            return;
        }

        // Si está bloqueado, intenta comprar con el saldo simulado
        int cost = Mathf.Max(0, item.price);
        if (coinWallet == null)
        {
            SetStatus("Falta asignar SimulatedCoinWallet en el Inspector.");
            return;
        }

        if (!coinWallet.HasEnoughCoins(cost))
        {
            SetStatus($"No alcanzan las monedas ({cost} requeridas).");
            return;
        }

        if (coinWallet.TrySpendCoins(cost))
        {
            SetItemUnlocked(index, true);
            _previewIndex = index;
            ApplyIndex(index);
            RefreshButtonsVisuals();
            SetStatus($"Compraste {GetItemLabel(index, item)} por {cost} monedas.");
        }
    }

    public void SelectPreview(int index)
    {
        if (index < -1 || index >= accessories.Count) return;
        _previewIndex = index;
        ApplyIndex(_previewIndex);
    }

    public void ApplySelection()
    {
        _appliedIndex = _previewIndex;
        ApplyIndex(_appliedIndex);

        if (panelRoot != null)
            panelRoot.SetActive(false);

        ResumeGameTime();
    }

    public void CancelAndClose()
    {
        _previewIndex = _appliedIndex;
        ApplyIndex(_appliedIndex);

        if (panelRoot != null)
            panelRoot.SetActive(false);

        ResumeGameTime();
    }

    [ContextMenu("Resetear desbloqueos simulados de accesorios")]
    public void ResetSimulatedUnlocks()
    {
        for (int i = 0; i < accessories.Count; i++)
        {
            PlayerPrefs.DeleteKey(GetUnlockKey(i, accessories[i]));
        }

        PlayerPrefs.Save();
        _previewIndex = -1;
        _appliedIndex = -1;
        ApplyIndex(-1);
        RefreshButtonsVisuals();
        SetStatus("Desbloqueos simulados reseteados.");
    }

    public void ResetFullSimulation()
    {
        if (coinWallet != null)
        {
            coinWallet.ResetToInitialSimulatedCoins();
        }

        ResetSimulatedUnlocks();
        SetStatus("Simulación reseteada (monedas y desbloqueos).");
    }

    private void PauseGameTime()
    {
        if (_isPausedByPanel) return;
        _previousTimeScale = Time.timeScale > 0f ? Time.timeScale : 1f;
        Time.timeScale = 0f;
        _isPausedByPanel = true;
    }

    private void ResumeGameTime()
    {
        if (!_isPausedByPanel) return;
        Time.timeScale = _previousTimeScale;
        _isPausedByPanel = false;
    }

    private void BuildButtons()
    {
        if (gridContainer == null || optionButtonPrefab == null) return;

        for (int i = gridContainer.childCount - 1; i >= 0; i--)
        {
            Destroy(gridContainer.GetChild(i).gameObject);
        }

        Button clearBtn = Instantiate(optionButtonPrefab, gridContainer);
        Image clearIcon = clearBtn.transform.Find("Icon")?.GetComponent<Image>();
        if (clearIcon != null)
            clearIcon.gameObject.SetActive(false);

        TMP_Text clearLabel = clearBtn.GetComponentInChildren<TMP_Text>();
        if (clearLabel != null)
            clearLabel.SetText("Sin accesorio");

        clearBtn.onClick.AddListener(() => OnOptionClicked(-1));

        for (int i = 0; i < accessories.Count; i++)
        {
            int capturedIndex = i;
            AccessoryOption item = accessories[i];

            Button btn = Instantiate(optionButtonPrefab, gridContainer);
            Image icon = btn.transform.Find("Icon")?.GetComponent<Image>();
            if (icon != null)
            {
                icon.gameObject.SetActive(item.sprite != null);
                icon.sprite = item.sprite;
            }

            TMP_Text label = btn.GetComponentInChildren<TMP_Text>();
            if (label != null)
            {
                string nameText = GetItemLabel(i, item);
                bool unlocked = IsItemUnlocked(i, item);
                label.SetText(unlocked ? nameText : $"{nameText} (${item.price})");
            }

            btn.onClick.AddListener(() => OnOptionClicked(capturedIndex));
        }
    }

    private void RefreshButtonsVisuals()
    {
        BuildButtons();
    }

    private bool IsItemUnlocked(int index, AccessoryOption item)
    {
        if (item.unlockedByDefault || item.price <= 0)
            return true;

        return PlayerPrefs.GetInt(GetUnlockKey(index, item), 0) == 1;
    }

    private void SetItemUnlocked(int index, bool unlocked)
    {
        AccessoryOption item = accessories[index];
        PlayerPrefs.SetInt(GetUnlockKey(index, item), unlocked ? 1 : 0);
        PlayerPrefs.Save();
    }

    private string GetUnlockKey(int index, AccessoryOption item)
    {
        string safeId = string.IsNullOrWhiteSpace(item.id) ? $"index_{index}" : item.id.Trim();
        return $"Prototipo_Sim_AccUnlocked_{safeId}";
    }

    private string GetItemLabel(int index, AccessoryOption item)
    {
        return string.IsNullOrWhiteSpace(item.id) ? $"Accesorio {index + 1}" : item.id;
    }

    private void SetStatus(string message)
    {
        if (statusLabel != null)
            statusLabel.text = message;
    }

    private void ApplyIndex(int index)
    {
        if (accessoryRenderer == null) return;

        if (index < 0 || index >= accessories.Count)
        {
            accessoryRenderer.sprite = null;
            return;
        }

        AccessoryOption item = accessories[index];
        accessoryRenderer.sprite = item.sprite;
        accessoryRenderer.transform.localPosition = item.localOffset;
        accessoryRenderer.transform.localEulerAngles = item.localEulerAngles;
        accessoryRenderer.transform.localScale = item.localScale == Vector3.zero ? Vector3.one : item.localScale;
    }
}