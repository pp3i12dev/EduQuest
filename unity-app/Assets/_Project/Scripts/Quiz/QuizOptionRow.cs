using TMPro;
using UnityEngine;
using UnityEngine.UI;

[System.Serializable]
public class QuizOptionRow
{
    public GameObject rowRoot;
    public TMP_InputField optionInput;
    public Toggle correctToggle;

    public bool IsVisible()
    {
        return rowRoot != null && rowRoot.activeSelf;
    }

    public void SetVisible(bool isVisible)
    {
        if (rowRoot != null)
            rowRoot.SetActive(isVisible);
    }

    public void Clear()
    {
        if (optionInput != null)
            optionInput.text = string.Empty;

        if (correctToggle != null)
            correctToggle.isOn = false;
    }

    public QuizOptionData ToOptionData()
    {
        return new QuizOptionData
        {
            text = optionInput != null ? optionInput.text.Trim() : string.Empty,
            isCorrect = correctToggle != null && correctToggle.isOn
        };
    }
}
