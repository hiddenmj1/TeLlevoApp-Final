import { Component, OnInit } from '@angular/core';
import { FirebaseService, TravelHistory } from '../services/firebase.service';

@Component({
  selector: 'app-travel-history-popover',
  templateUrl: './travel-history-popover.component.html',
  styleUrls: ['./travel-history-popover.component.scss'],
})
export class TravelHistoryPopoverComponents  implements OnInit {
  travelHistory: TravelHistory[] = [];
  constructor(private firebaseService: FirebaseService) { }
  
  ngOnInit() {
    this.getTravelHistory();
  }

  async getTravelHistory() {
    try {
      const user = await this.firebaseService.getCurrentUser();
      if (user) {
        this.firebaseService.getviajestomados(user.uid).subscribe((history: TravelHistory[]) => {
          console.log('Fetched travel history:', history);
          this.travelHistory = history;
        });
      }
    } catch (error) {
      console.error('Error fetching travel history:', error);
    }
  }

}
