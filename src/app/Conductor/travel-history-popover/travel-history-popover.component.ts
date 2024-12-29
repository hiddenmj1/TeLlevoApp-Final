import { Component, OnInit } from '@angular/core';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-travel-history-popover',
  templateUrl: './travel-history-popover.component.html',
  styleUrls: ['./travel-history-popover.component.scss'],
})
export class TravelHistoryPopoverComponent implements OnInit {
  travelHistory: any[] = [];

  constructor(private firebaseService: FirebaseService) {}

  ngOnInit() {
    this.getTravelHistory();
  }

  async getTravelHistory() {
    try {
      const user = await this.firebaseService.getCurrentUser();
      if (user) {
        this.firebaseService.getTravelHistory(user.uid).subscribe(history => {
          console.log('Fetched travel history:', history); // Add this line
          this.travelHistory = history;
        });
      }
    } catch (error) {
      console.error('Error fetching travel history:', error);
    }
  }
}