using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace EduQuest.Student
{
    /// <summary>
    /// Sonidos y música original en bucle, sin dependencias de Unity Audio Mixer.
    /// Se conserva una sola instancia entre escenas; la música tiene volumen propio.
    /// </summary>
    public sealed class EduQuestSound : MonoBehaviour
    {
        private const string EnabledKey = "EduQuest.Audio.Enabled";
        private const string VolumeKey = "EduQuest.Audio.Volume";
        private const string MusicEnabledKey = "EduQuest.Music.Enabled";
        private const string MusicVolumeKey = "EduQuest.Music.Volume";
        private static EduQuestSound instance;
        private static bool quitting;
        private AudioSource source;
        private AudioSource musicSource;
        private AudioListener fallbackListener;
        private int nextListenerCheck;
        private readonly Dictionary<string, AudioClip> clips = new Dictionary<string, AudioClip>();
        private readonly HashSet<string> missing = new HashSet<string>();

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        private static void ResetDomain() { quitting = false; instance = null; }
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void Bootstrap() { Prepare(); }

        public static bool Enabled => PlayerPrefs.GetInt(EnabledKey, 1) == 1;
        public static float Volume => Mathf.Clamp01(PlayerPrefs.GetFloat(VolumeKey, 0.7f));
        public static bool MusicEnabled => PlayerPrefs.GetInt(MusicEnabledKey, 1) == 1;
        public static float MusicVolume => Mathf.Clamp01(PlayerPrefs.GetFloat(MusicVolumeKey, 0.22f));

        public static void Prepare()
        {
            if (instance != null || quitting) return;
            var host = new GameObject("EduQuest - Música y efectos");
            instance = host.AddComponent<EduQuestSound>();
            DontDestroyOnLoad(host);
        }

        private void Awake()
        {
            if (instance != null && instance != this) { Destroy(gameObject); return; }
            instance = this;
            source = gameObject.AddComponent<AudioSource>();
            source.playOnAwake = false;
            source.loop = false;
            source.spatialBlend = 0f;
            source.ignoreListenerPause = true;

            musicSource = gameObject.AddComponent<AudioSource>();
            musicSource.playOnAwake = false;
            musicSource.loop = true;
            musicSource.spatialBlend = 0f;
            musicSource.volume = MusicVolume;
            musicSource.clip = Resources.Load<AudioClip>("EduQuest/Audio/BackgroundLoop");
            if (musicSource.clip == null)
                Debug.LogWarning("EduQuest: falta el audio Resources/EduQuest/Audio/BackgroundLoop.wav");
            fallbackListener = gameObject.AddComponent<AudioListener>();
            SyncListener();
            SyncMusic();
            SceneManager.sceneLoaded += OnSceneLoaded;
        }

        private void OnSceneLoaded(Scene scene, LoadSceneMode mode) { SyncListener(); SyncMusic(); }
        private void LateUpdate()
        {
            if (Time.frameCount < nextListenerCheck) return;
            nextListenerCheck = Time.frameCount + 60;
            SyncListener();
        }
        private void SyncListener()
        {
            if (fallbackListener == null) return;
            bool anotherEnabled = false;
            foreach (var other in FindObjectsByType<AudioListener>())
            {
                if (other != fallbackListener && other.isActiveAndEnabled)
                { anotherEnabled = true; break; }
            }
            fallbackListener.enabled = !anotherEnabled;
        }
        private void SyncMusic()
        {
            if (musicSource == null) return;
            musicSource.volume = MusicVolume;
            if (MusicEnabled && MusicVolume > 0f && musicSource.clip != null)
            {
                if (!musicSource.isPlaying) musicSource.Play();
            }
            else if (musicSource.isPlaying) musicSource.Pause();
        }
        private void OnDestroy()
        {
            SceneManager.sceneLoaded -= OnSceneLoaded;
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
        public static void SetMusicEnabled(bool enabled)
        {
            PlayerPrefs.SetInt(MusicEnabledKey, enabled ? 1 : 0);
            PlayerPrefs.Save();
            Prepare();
            if (instance != null) instance.SyncMusic();
        }
        public static void SetMusicVolume(float volume)
        {
            PlayerPrefs.SetFloat(MusicVolumeKey, Mathf.Clamp01(volume));
            PlayerPrefs.Save();
            Prepare();
            if (instance != null) instance.SyncMusic();
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
