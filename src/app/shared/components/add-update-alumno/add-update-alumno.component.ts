import { alumnos } from "./../../../models/alumnos.model";
import { Component, inject, Input, input, OnInit } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { User } from "src/app/models/user.model";
import { FirebaseService } from "src/app/services/firebase.service";
import { UtilsService } from "src/app/services/utils.service";

// Custom validator to check if the date is before 1900
function dateValidator(control: FormControl) {
  const value = control.value;
  const date = new Date(value);
  const minDate = new Date("1940-01-01");

  if (date < minDate) {
    return { dateInvalid: true };
  }
  return null;
}

// Custom validator to check if the name contains only letters and spaces
function nameValidator(control: FormControl) {
  const value = control.value;
  const regex = /^[a-zA-Z\s]*$/;

  if (!regex.test(value)) {
    return { nameInvalid: true };
  }
  return null;
}

@Component({
  selector: "app-add-update-alumno",
  templateUrl: "./add-update-alumno.component.html",
  styleUrls: ["./add-update-alumno.component.scss"],
})
export class AddUpdateAlumnoComponent implements OnInit {
  @Input() alumno: alumnos;

  form = new FormGroup({
    id: new FormControl(""),
    image: new FormControl("", Validators.required),
    nombre: new FormControl("", [
      Validators.required,
      Validators.minLength(4),
      nameValidator,
    ]),
    fechadenac: new FormControl("", [Validators.required, dateValidator]),
    matricula: new FormControl("", [
      Validators.required,
      Validators.minLength(4),
    ]),
    email: new FormControl("", [Validators.required, Validators.email]),
    grupo: new FormControl("", Validators.required),
  });

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  user = {} as User;

  ngOnInit() {
    this.user = this.utilsSvc.getFromLocalStorage("user");
    if (this.alumno) this.form.setValue(this.alumno);
  }

  async takeImage() {
    const dataUrl = (await this.utilsSvc.takePicture("Imagen del Alumno"))
      .dataUrl;
    this.form.controls.image.setValue(dataUrl);
  }

  submit() {
    if (this.form.valid) {
      if (this.alumno) this.updateAlumno();
      else this.createAlumno();
    }
  }

  async createAlumno() {
    let path = `users/${this.user.uid}/alumnos`;

    const loading = await this.utilsSvc.loading();
    await loading.present();

    // === Subir la iamgen y obtener el URL ===
    let dataUrl = this.form.value.image;
    let imagePath = `${this.user.uid}/${Date.now()}`;
    let imageUrl = await this.firebaseSvc.uploadImage(imagePath, dataUrl);
    this.form.controls.image.setValue(imageUrl);

    delete this.form.value.id;

    this.firebaseSvc
      .addDocument(path, this.form.value)
      .then(async (res) => {
        this.utilsSvc.dismessModal({ success: true });

        this.utilsSvc.presentToast({
          message: "Alumno agregado con éxito",
          color: "success",
          duration: 1500,
          position: "middle",
          icon: "checkmark-circle=outline",
        });
      })
      .catch((error) => {
        console.log(error);

        this.utilsSvc.presentToast({
          message: error.message,
          duration: 2500,
          color: "primary",
          position: "middle",
          icon: "alert.circle.outline",
        });
      })
      .finally(() => {
        loading.dismiss();
      });
  }

  // ====== Actualizar Alumno =====
  async updateAlumno() {
    let path = `users/${this.user.uid}/alumnos/${this.alumno.id}`;

    const loading = await this.utilsSvc.loading();
    await loading.present();

    // === Si cambia imagen, subir la nueva y obtener la url ===
    if (this.form.value.image !== this.alumno.image) {
      let dataUrl = this.form.value.image;
      let imagePath = await this.firebaseSvc.getFilePath(this.alumno.image);
      let imageUrl = await this.firebaseSvc.uploadImage(imagePath, dataUrl);
      this.form.controls.image.setValue(imageUrl);
    }

    delete this.form.value.id;

    this.firebaseSvc
      .updateDocument(path, this.form.value)
      .then(async (res) => {
        this.utilsSvc.dismessModal({ success: true });

        this.utilsSvc.presentToast({
          message: "Alumno actualizado con éxito",
          color: "success",
          duration: 1500,
          position: "middle",
          icon: "checkmark-circle=outline",
        });
      })
      .catch((error) => {
        console.log(error);

        this.utilsSvc.presentToast({
          message: error.message,
          duration: 2500,
          color: "primary",
          position: "middle",
          icon: "alert.circle.outline",
        });
      })
      .finally(() => {
        loading.dismiss();
      });
  }
}
