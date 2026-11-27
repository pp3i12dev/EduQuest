using System;
using TMPro;
using UnityEngine;

public class SimulatedCoinWallet : MonoBehaviour
{
    private const string SimCoinsKey = "Prototipo_Sim_Coins";
    private const string SimInitializedKey = "Prototipo_Sim_Coins_Init";

    [Header("Simulación de saldo inicial")]
    [Tooltip("Cantidad de monedas simuladas disponibles al iniciar la prueba")]
    [SerializeField] private int initialSimulatedCoins = 150;

    [Header("UI de monedas (opcional)")]
    [SerializeField] private TMP_Text coinsLabel;
    [SerializeField] private string labelPrefix = "Monedas (Sim): ";

    public int CurrentCoins { get; private set; }
    public event Action<int> OnCoinsChanged;

    private void Awake()
    {
        // Si nunca se inicializó la simulación, cargamos el saldo simulado X
        if (PlayerPrefs.GetInt(SimInitializedKey, 0) == 0)
        {
            CurrentCoins = Mathf.Max(0, initialSimulatedCoins);
            PlayerPrefs.SetInt(SimInitializedKey, 1);
            SaveCoins();
        }
        else
        {
            CurrentCoins = Mathf.Max(0, PlayerPrefs.GetInt(SimCoinsKey, initialSimulatedCoins));
        }

        UpdateUI();
    }

    public bool HasEnoughCoins(int price)
    {
        return price <= 0 || CurrentCoins >= price;
    }

    public bool TrySpendCoins(int price)
    {
        if (price < 0) return false;
        if (!HasEnoughCoins(price)) return false;

        CurrentCoins -= price;
        SaveCoins();
        UpdateUI();
        OnCoinsChanged?.Invoke(CurrentCoins);
        return true;
    }

    // Útil para volver a cargar el saldo simulado inicial X durante pruebas
    public void ResetToInitialSimulatedCoins()
    {
        CurrentCoins = Mathf.Max(0, initialSimulatedCoins);
        SaveCoins();
        UpdateUI();
        OnCoinsChanged?.Invoke(CurrentCoins);
    }

    private void SaveCoins()
    {
        PlayerPrefs.SetInt(SimCoinsKey, CurrentCoins);
        PlayerPrefs.Save();
    }

    private void UpdateUI()
    {
        if (coinsLabel != null)
        {
            coinsLabel.text = $"{labelPrefix}{CurrentCoins}";
        }
    }

    [ContextMenu("Resetear monedas simuladas")]
    private void ContextMenuResetCoins()
    {
        ResetToInitialSimulatedCoins();
    }

}