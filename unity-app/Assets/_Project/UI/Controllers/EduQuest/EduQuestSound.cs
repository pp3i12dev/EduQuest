using System.Collections.Generic;
using UnityEngine;

namespace EduQuest.Student
{
    /// <summary>
    /// Efectos de audio comunes para UI Toolkit y juegos. Los clips se cargan desde
    /// Resources/EduQuest/Audio. Un solo AudioSource persiste al cambiar escenas.
    /// Se pueden reemplazar los WAV sin modificar código ni escenas.
    /// </summary>
    public sealed class EduQuestSound : MonoBehaviour
    {
        private const string EnabledKey = "EduQuest.Audio.Enabled";
        private const string VolumeKey = "EduQuest.Audio.Volume";
        private static EduQuestSound instance;
        private static bool quitting;
        private AudioSource source;
        private readonly Dictionary<string, AudioClip> clips = new Dictionary<string, AudioClip>();
        private readonly HashSet<string> missing = new HashSet<string>();

        public static bool Enabled => PlayerPrefs.GetInt(EnabledKey, 1) == 1;
        public static float Volume => Mathf.Clamp01(PlayerPrefs.GetFloat(VolumeKey, 0.7f));

        public static void Prepare()
        {
            if (instance != null || quitting) return;
            var audioObject = new GameObject("EduQuest - Audio UI");
            instance = audioObject.AddComponent<EduQuestSound>();
            DontDestroyOnLoad(audioObject);
        }

        private void Awake()
        {
            if (instance != null && instance != this)
            {
                Destroy(gameObject);
                return;
            }
            instance = this;
            source = gameObject.GetComponent<AudioSource>();
            if (source == null) source = gameObject.AddComponent<AudioSource>();
            source.playOnAwake = false;
            source.loop = false;
            source.spatialBlend = 0f;
            source.ignoreListenerPause = true;
        }

        private void OnDestroy()
        {
            if (instance == this) instance = null;
        }

        private void OnApplicationQuit() { quitting = true; }

        public static void SetEnabled(bool enabled)
        {
            PlayerPrefs.SetInt(EnabledKey, enabled ? 1 : 0);
            PlayerPrefs.Save();
        }

        public static void SetVolume(float volume)
        {
            PlayerPrefs.SetFloat(VolumeKey, Mathf.Clamp01(volume));
            PlayerPrefs.Save();
        }

        private static void Play(string cue, float multiplier = 1f)
        {
            if (!Enabled || Volume <= 0f || quitting) return;
            Prepare();
            if (instance == null || instance.source == null) return;
            if (!instance.clips.TryGetValue(cue, out var clip))
            {
                clip = Resources.Load<AudioClip>("EduQuest/Audio/" + cue);
                instance.clips[cue] = clip;
                if (clip == null && instance.missing.Add(cue))
                    Debug.LogWarning("EduQuest Audio: falta Resources/EduQuest/Audio/" + cue + ".wav");
            }
            if (clip != null) instance.source.PlayOneShot(clip, Mathf.Clamp01(Volume * multiplier));
        }

        public static void Tap() { Play("Tap", 0.65f); }
        public static void Back() { Play("Back", 0.8f); }
        public static void Correct() { Play("Correct"); }
        public static void Incorrect() { Play("Incorrect"); }
        public static void Partial() { Play("Partial"); }
        public static void Success() { Play("Success"); }
        public static void Failure() { Play("Failure"); }
    }
}
