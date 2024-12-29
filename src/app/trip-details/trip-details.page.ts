import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-trip-details',
  templateUrl: './trip-details.page.html',
  styleUrls: ['./trip-details.page.scss'],
})
export class TripDetailsPage implements OnInit {
  viaje: any;

  constructor(private router: Router) {
    const navigation = this.router.getCurrentNavigation();
    this.viaje = navigation?.extras?.state?.['viaje'];
  }

  ngOnInit() {}


  cancelarViaje() {
    this.router.navigate(['/home']);
  }
}