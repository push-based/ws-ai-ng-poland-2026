import { Component, output } from '@angular/core';

/**
 * The seat-reservation form of exercise 4.3. Its template is the participant
 * file exercise.html; this class only forwards the native submit event to the
 * page. No FormsModule: the browser (and WebMCP) see a plain HTML form.
 */
@Component({
  selector: 'app-lab-reservation-form',
  templateUrl: './exercise.html',
})
export class LabReservationForm {
  readonly submitted = output<SubmitEvent>();
}
