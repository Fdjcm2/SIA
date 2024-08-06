import { alumnos } from "./../../../models/alumnos.model";
import { Component, inject, OnInit } from "@angular/core";
import { User } from "src/app/models/user.model";
import { FirebaseService } from "src/app/services/firebase.service";
import { UtilsService } from "src/app/services/utils.service";
import { AddUpdateAlumnoComponent } from "src/app/shared/components/add-update-alumno/add-update-alumno.component";

@Component({
  selector: "app-home",
  templateUrl: "./home.page.html",
  styleUrls: ["./home.page.scss"],
})
export class HomePage implements OnInit {
  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  alumnos: alumnos[] = [];
  filteredAlumnos: alumnos[] = [];
  loading: boolean;

  ngOnInit() {}

  user(): User {
    return this.utilsSvc.getFromLocalStorage("user");
  }

  ionViewWillEnter() {
    this.getAlumnos();
  }

  doRefresh(event) {
    console.log("Begin async operation");
    setTimeout(() => {
      this.getAlumnos();
      event.target.complete();
    }, 1000);
  }

  // ==== Obtener alumnos ====
  getAlumnos() {
    const path = `users/${this.user().uid}/alumnos`;

    const sub = this.firebaseSvc.getCollectionData(path).subscribe({
      next: (res: any) => {
        console.log(res);
        this.alumnos = res;
        this.filteredAlumnos = res; // Inicializamos la lista filtrada

        this.loading = false;
        sub.unsubscribe();
      },
    });
  }

  // ==== Cerrar Sesion ====
  signOut() {
    this.firebaseSvc.signOut();
  }

  // ===== Agregar o actualizar un alumno ====
  async addUpdateAlumno(alumno?: alumnos) {
    let success = await this.utilsSvc.presentModal({
      component: AddUpdateAlumnoComponent,
      cssClass: "add-update-modal",
      componentProps: { alumno },
    });

    if (success) this.getAlumnos();
  }

  // ============ Buscar alumnos al instante ============
  handleInput(event: any) {
    const query = event.target.value.toLowerCase();
    this.filteredAlumnos = this.alumnos.filter((alumno) =>
      alumno.nombre.toLowerCase().includes(query)
    );
  }

  async confirmDeleteAlumno(alumno: alumnos) {
    this.utilsSvc.presentAlert({
      header: "Eliminar Alumno",
      message: "¿Quieres eliminar este alumno?",
      mode: "ios",
      buttons: [
        {
          text: "Cancelar",
        },
        {
          text: "Si, eliminar",
          handler: () => {
            this.deleteAlumno(alumno);
          },
        },
      ],
    });
  }

  // =========== Eliminar alumno =========
  async deleteAlumno(alumno: alumnos) {
    let path = `users/${this.user().uid}/alumnos/${alumno.id}`;

    const loading = await this.utilsSvc.loading();
    await loading.present();

    let imagePath = await this.firebaseSvc.getFilePath(alumno.image);
    await this.firebaseSvc.deleteFile(imagePath);

    this.firebaseSvc
      .deleteDocument(path)
      .then(async (res) => {
        this.filteredAlumnos = this.filteredAlumnos.filter(
          (a) => a.id !== alumno.id
        );

        this.utilsSvc.presentToast({
          message: "Alumno eliminado con éxito",
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
