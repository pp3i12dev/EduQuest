using System;
using System.Collections.Generic;

public static class ServiceLocator
{
    private static readonly Dictionary<Type, object> services = new();

    public static void Register<T>(T instance) => services[typeof(T)] = instance;
    public static T Get<T>() => (T)services[typeof(T)];
}