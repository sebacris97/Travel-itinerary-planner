
https://traveleritinerary.netlify.app/


# Travel Itinerary Planner 🌍✈️

A complete, client-side web application designed to help users efficiently organize multi-destination trips. The entire itinerary state is automatically saved in the URL, making it easy to share and persist data without the need for a backend.

## 🚀 Installation and Usage

Since this is a purely frontend application, simply open the `Travel itinerary planner/index.html` file in your web browser.

## ✨ Key Features

### 1. Destination and Date Management

* **Dynamic Destination Management:** Easily add, delete, and **reorder** destinations using drag-and-drop functionality (powered by SortableJS).
* **Day Tracking:**
    * Set a **Start Date** and the **Total Trip Days**.
    * The application automatically adjust the specific stay dates for each destination sequentially.
    * Provides a dynamic summary of **Planned** vs. **Remaining** days.
    * The **Autofill Days** function equally distributes the total days across all planned destinations.

### 2. Budget and Currency

* **Expense Tracking:** Input and total estimated costs for **Accommodation** and **Transport** to get a comprehensive **Global Total**.
* **Currency Support:** Supports multiple currencies, including **USD, EUR, GBP, and JPY**, updating all symbols across the interface.

### 3. Contextual Search Links

Each destination and transport segment offers one-click links to external services, using the relevant dates and cities:

* **Hotel Search:** Links to **Booking.com** for the city and the calculated check-in/check-out dates.
* **Flight Search:** Links to **Google Flights** for flight options between consecutive destinations.
* **Ground Transport Search:** Links to **Rome2Rio** for bus and train routes between consecutive destinations.

### 4. Data Persistence and Export

* **URL-Based State:** The complete itinerary state is **compressed and encoded into the URL** using LZString for instant sharing and automatic saving.
* **JSON Import/Export:** Save and load your itinerary as a standard JSON file.
* **ICS Calendar Export:** Generate a calendar file (iCalendar format) to import all trip events and stay details into your preferred calendar application.

## 🛠️ Technology Stack

* **HTML5 / Tailwind CSS:** Used for a modern, responsive, and utility-first dark-mode user interface.
* **JavaScript (Vanilla JS):** Handles all core logic, state management, date calculations, and external service integrations.
* **Third-party Libraries:**
    * **SortableJS:** Allows drag-and-drop reordering of destinations.
    * **LZString:** Used for highly efficient compression of itinerary data, allowing the entire state to be stored in the URL query string.
    * **Lucide Icons:** Provides the vector icon library for the UI.
