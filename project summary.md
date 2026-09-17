# Project Summary: Hillcrest High School Student Lookup & Roster App

## Overview
A web-based student information and roster management tool designed for Hillcrest High School staff. The application provides lightning-fast search capabilities, detailed student profile views, administrative editing tools, bulk update utilities, and multi-layout rendering (list and card grids with print/PDF export functionality).

---

## Architecture & File Structure
* **`index.html`**: Main application markup featuring the search header, filter modal, dynamic results table, card grid views, and the staff authentication popover/drawer container.
* **`css/style.css`**: Application styling and responsive layout rules.
* **`js/app.js`**: Core controller wiring data services, search filters, event listeners, drawer interactions, and bulk operations.
* **`js/data-service.js`**: Handles data retrieval and synchronization (backed by Firebase Firestore).
* **`js/search.js`**: Handles student filtering and sorting logic.
* **`js/render.js`**: Manages HTML template generation for rows, cards, drawers, and modal windows.
* **`js/config.js`**: Environment and Firebase configuration settings.

---

## Core Features & Functionality

### 1. Search & Filtering
* **Multi-field Search**: Search by Admin Number, Student Name, or Registration Class (with an "Auto" option).
* **Advanced Filter Panel**: Filter students dynamically by:
  * Grade (8 through 12)
  * Registration Class
  * Gender (Male/Female)
  * Subject & Subject Teacher (with dependent dropdowns)
  * Subject Line (`filterLine`)

### 2. View Layouts & Export
* **Layout Switching**: Toggle instantly between **List view**, **Grid · 2 view**, and **Grid · 4 view**.
* **Print/PDF Export**: Automatically forces eager loading of student avatar images before invoking the browser print dialog for reliable badge/card exporting.

### 3. Staff Administration (Authenticated Mode)
* **Staff Sign-In**: Understated authentication popover in the header header to unlock administrative privileges (`isAdmin`).
* **Student Management Drawer**:
  * View read-only student details and subject enrollments.
  * Edit student information inline, swap or add subjects, change teachers, and adjust line numbers.
  * Multi-step **Add New Student** workflow with duplicate Admin Number validation.
* **Bulk Update Modal**: Perform batch modifications across student records for:
  * Registration Class
  * Grade
  * Subject Teachers (scoped by subject)
  * Subject Lines (scoped by subject)

---

## Recent Updates & Current State
* Integrated and validated the **Subject Line filter** across `index.html` and `app.js`.
* Corrected form element bindings (resolving ID mismatches between `bulkUpdateForm` and submission handlers).
* Cleaned up conditional execution blocks for bulk updating student subject lines and teachers.