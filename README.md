# Flying Project ✈️

The Flying Project is a modern web application development project. It leverages core web technologies including **JavaScript, CSS, and HTML**.

---

## Project Structure

The project is organized into the following main folders:

* **`client/`**: Contains the **client-side code**, including the user interface and interactions.
* **`server/`**: Holds the **server-side code**, which includes API endpoints and server logic.

---

## Technologies Used

* **JavaScript**
* **CSS**
* **HTML**

---

## Setup and Running

To set up and run the project on your local machine, follow these steps:

1.  **Clone the repository:**

    ```bash
    git clone [https://github.com/zehraozturkk/flying-project.git](https://github.com/zehraozturkk/flying-project.git)
    ```

2.  **Install dependencies:**

    After cloning the project, navigate into the project directory and install both client and server dependencies:

    ```bash
    cd flying-project

    
    # Server dependencies
    cd ../server
    node scripts/setup.js  // for database structure
    npm install
    ```

3.  **Start the application:**

    Open two separate terminal windows to start the server and the client:

    **Start the server (in the first terminal):**

    ```bash
    cd server
    npm start
    ```

    **Start the client (in the second terminal):**

    ```bash
    cd client
    npm start
    ```