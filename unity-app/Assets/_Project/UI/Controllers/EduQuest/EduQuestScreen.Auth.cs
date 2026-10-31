using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.UIElements;

namespace EduQuest.Student
{
    public partial class EduQuestScreen
    {
        private List<InstitutionDTO> institutions = new List<InstitutionDTO>();
        private List<CareerDTO> careers = new List<CareerDTO>();
        private List<CourseDTO> courses = new List<CourseDTO>();
        private int selectedInstitution, selectedCareer, selectedCourse;

        private void SetupWelcome()
        {
            Click("login", () => StudentNavigation.Go("Login"));
            Click("register", () => StudentNavigation.Go("Register"));
            Click("web-admin", () => Application.OpenURL(ApiConfig.WebAdminUrl));
        }
        private void SetupLogin()
        {
            Password("password");
            Click("back", () => StudentNavigation.Go("Welcome"));
            Click("submit", () => Run(async () =>
            {
                string identity = Value("identity");
                string password = Value("password");
                if (string.IsNullOrWhiteSpace(identity) || string.IsNullOrEmpty(password)) throw new Exception("Completá tus credenciales.");
                var request = new LoginRequestDTO { password = password };
                if (identity.Contains("@")) request.email = identity; else request.dni = identity;
                var login = await EduQuestRuntime.Auth.LoginAsync(request);
                if (this == null) return;
                if (!login.Success) throw new Exception(login.ErrorMessage);
                if (!EduQuestRuntime.Session.IsStudent())
                {
                    EduQuestRuntime.Session.ClearSession();
                    throw new Exception("Unity es exclusivo para alumnos. Ingresá al Web Admin para otros roles.");
                }
                StudentNavigation.Go("Home");
            }));
        }
        private void SetupRegister()
        {
            Password("password"); Password("confirm-password");
            var form = Q<VisualElement>("personal-form");
            form.style.display = DisplayStyle.None;
            Click("back", () => StudentNavigation.Go("Welcome"));
            var ins = Q<DropdownField>("institution");
            var car = Q<DropdownField>("career");
            var cou = Q<DropdownField>("course");
            void ResetCareer()
            {
                selectedCareer = 0; careers.Clear();
                car.choices = new List<string>{ "Elegí primero una institución" }; car.index = 0;
                selectedCourse = 0; courses.Clear();
                cou.choices = new List<string>{ "Elegí primero una carrera" }; cou.index = 0;
                form.style.display = DisplayStyle.None;
            }
            ResetCareer();
            ins.choices = new List<string>{ "Cargando instituciones..." }; ins.index = 0;
            ins.RegisterValueChangedCallback(evt =>
            {
                int index = ins.index - 1;
                selectedInstitution = index >= 0 && index < institutions.Count ? institutions[index].id : 0;
                ResetCareer();
                if (selectedInstitution <= 0) return;
                int institutionForRequest = selectedInstitution;
                Run(async () =>
                {
                    var list = await EduQuestRuntime.Academic.GetCareersAsync(institutionForRequest);
                    if (this == null || selectedInstitution != institutionForRequest) return;
                    careers = list ?? new List<CareerDTO>();
                    car.choices = new[]{ "Seleccioná una carrera" }.Concat(careers.Select(x => x.nombre)).ToList();
                    car.index = 0;
                    if (careers.Count == 0) Status("Esta institución no tiene carreras disponibles.");
                });
            });
            car.RegisterValueChangedCallback(evt =>
            {
                int index = car.index - 1;
                selectedCareer = index >= 0 && index < careers.Count ? careers[index].id : 0;
                courses.Clear(); selectedCourse = 0;
                cou.choices = new List<string>{ "Elegí primero una carrera" }; cou.index = 0;
                form.style.display = DisplayStyle.None;
                if (selectedCareer <= 0) return;
                int careerForRequest = selectedCareer;
                Run(async () =>
                {
                    var list = await EduQuestRuntime.Academic.GetCoursesAsync(careerForRequest);
                    if (this == null || selectedCareer != careerForRequest) return;
                    courses = list ?? new List<CourseDTO>();
                    cou.choices = new []{ "Seleccioná un curso" }.Concat(courses.Select(x => x.nombre + " · " + x.academicYear)).ToList();
                    cou.index = 0;
                    if (courses.Count == 0) Status("No hay cursos asociados a esta carrera.");
                });
            });
            cou.RegisterValueChangedCallback(evt =>
            {
                int index = cou.index - 1;
                selectedCourse = index >= 0 && index < courses.Count ? courses[index].id : 0;
                form.style.display = selectedCourse > 0 ? DisplayStyle.Flex : DisplayStyle.None;
            });
            Click("submit", () => Run(async () =>
            {
                string password = Value("password");
                if (selectedInstitution == 0 || selectedCareer == 0 || selectedCourse == 0) throw new Exception("Elegí institución, carrera y curso.");
                if (new[]{Value("dni"), Value("first-name"), Value("last-name"), Value("email"), password }.Any(string.IsNullOrWhiteSpace))
                    throw new Exception("Completá todos los campos obligatorios.");
                if (password.Length < 8) throw new Exception("La contraseña debe tener al menos 8 caracteres.");
                if (password != Value("confirm-password")) throw new Exception("Las contraseñas no coinciden.");
                var data = new RegisterStudentRequestDTO {
                    dni = Value("dni"), firstName = Value("first-name"), lastName = Value("last-name"),
                    email = Value("email"), telefono = Value("phone"), password = password,
                    institutionId = selectedInstitution, careerId = selectedCareer, courseId = selectedCourse
                };
                var result = await EduQuestRuntime.Auth.RegisterStudentAsync(data);
                if (this == null) return;
                if (!result.Success) throw new Exception(result.ErrorMessage);
                form.style.display = DisplayStyle.None;
                Status(result.Data?.message ?? "Solicitud enviada. Esperá la aprobación institucional para ingresar.", true);
            }));
            Run(async () =>
            {
                var list = await EduQuestRuntime.Academic.GetInstitutionsAsync();
                if (this == null) return;
                institutions = list ?? new List<InstitutionDTO>();
                ins.choices = new[]{ "Seleccioná tu institución" }.Concat(institutions.Select(x => x.nombre)).ToList();
                ins.index = 0;
                if (institutions.Count == 0) Status("No hay instituciones disponibles para registrarse.");
            });
        }
    }
}
