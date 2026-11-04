using UnityEngine;

public class CameraFollow : MonoBehaviour
{
    [SerializeField] private Transform target;
    [SerializeField] private Vector3 offset = new Vector3(0f, 0f, -10f);

    private void LateUpdate()
    {
        if (target != null)
        {
            Vector3 nuevaPosicion = target.position + offset;
            // Mantiene la cámara fija en Y para un plataformero clásico de avance lateral
            transform.position = new Vector3(nuevaPosicion.x, transform.position.y, nuevaPosicion.z);
        }
    }
}