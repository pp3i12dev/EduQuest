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
        public Vector3 localOffset;
        public Vector3 localEulerAngles;
        public Vector3 localScale;
    }

    [Header("Anclaje en el hueso de la cabeza")]
    [SerializeField] private SpriteRenderer accessoryRenderer;

    [Header("UI del selector")]
    [SerializeField] private GameObject panelRoot;
    [SerializeField] private Transform gridContainer;
    [SerializeField] private Button optionButtonPrefab;
    [SerializeField] private Button applyButton;
    [SerializeField] private Button closeButton;

    [Header("Catálogo de prueba")]
    [SerializeField] private List<AccessoryOption> accessories = new();

    [Header("Vista previa en Editor (sin Play)")]
    [Min(-1)]
    [SerializeField] private int previewInEditorIndex = -1;

    private int _appliedIndex = -1;
    private int _previewIndex = -1;
    private float _previousTimeScale = 1f;
    private bool _isPausedByPanel;

    private void Awake()
    {
        if (!Application.isPlaying)
        {
            ApplyIndex(previewInEditorIndex);
            return;
        }

        if (applyButton != null)
            applyButton.onClick.AddListener(ApplySelection);

        if (closeButton != null)
            closeButton.onClick.AddListener(CancelAndClose);

        BuildButtons();
        ApplyIndex(_appliedIndex);

        if (panelRoot != null)
            panelRoot.SetActive(false);
    }

    private void OnValidate()
    {
        if (Application.isPlaying) return;
        ApplyIndex(previewInEditorIndex);
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

        if (panelRoot != null)
            panelRoot.SetActive(true);

        if (Application.isPlaying)
            PauseGameTime();
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

        if (Application.isPlaying)
            ResumeGameTime();
    }

    public void CancelAndClose()
    {
        _previewIndex = _appliedIndex;
        ApplyIndex(_appliedIndex);

        if (panelRoot != null)
            panelRoot.SetActive(false);

        if (Application.isPlaying)
            ResumeGameTime();
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
        clearBtn.GetComponentInChildren<TMP_Text>()?.SetText("Sin accesorio");
        clearBtn.onClick.AddListener(() => SelectPreview(-1));

        for (int i = 0; i < accessories.Count; i++)
        {
            int capturedIndex = i;
            AccessoryOption item = accessories[i];
            Button btn = Instantiate(optionButtonPrefab, gridContainer);

            Image icon = btn.transform.Find("Icon")?.GetComponent<Image>();
            if (icon != null) icon.sprite = item.sprite;

            TMP_Text label = btn.GetComponentInChildren<TMP_Text>();
            if (label != null && icon == null) label.SetText(string.IsNullOrEmpty(item.id) ? $"Item {i + 1}" : item.id);

            btn.onClick.AddListener(() => SelectPreview(capturedIndex));
        }
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

    private void LateUpdate()
    {
        if (!Application.isPlaying) return;
        if (Time.timeScale <= 0f) return;

        // Reaplica el índice activo tras la animación del frame para evitar desfasajes en salto o movimiento
        int activeIndex = (panelRoot != null && panelRoot.activeSelf) ? _previewIndex : _appliedIndex;
        ApplyIndex(activeIndex);
    }
}