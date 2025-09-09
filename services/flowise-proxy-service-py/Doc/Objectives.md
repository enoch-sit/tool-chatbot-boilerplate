# Flowise-Proxy-Service: User Roles and Permissions Documentation

This document outlines the roles and permissions within the Flowise-Proxy-Service. It details the capabilities of Administrators and standard Users, particularly concerning chatflow management, visibility, and credit usage.

## 1. Overview

The Flowise-Proxy-Service utilizes a role-based access control model to ensure that users have appropriate access to system functionalities and data. The two primary roles defined in this system are:

* **Admin:** Users with administrative privileges who can manage chatflows, users, and overall system configurations.
* **User:** Standard users who can interact with chatflows assigned to them and view their usage.

## 2. Roles and Permissions

| Role   | Capability                               | Description                                                                                                                                                              |
| :----- | :--------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin** | **User Management**                      |                                                                                                                                                                          |
|        | List All Users (from Authentication API) | Administrators can retrieve and view a list of all registered users within the system. This information is typically sourced from an external authentication API.         |
|        | **Chatflow Management**                  |                                                                                                                                                                          |
|        | List All Chatflows                       | Administrators can view a comprehensive list of all available chatflows within the system, regardless of user assignment.                                               |
|        | Add Chatflow to User                     | Administrators can assign specific chatflows to individual users. This enables users to access and utilize the assigned chatflows.                                     |
|        | Remove Chatflow from User                  | Administrators can revoke a user's access to specific chatflows. This is crucial for managing licenses, changing user responsibilities, or offboarding users.           |
| **User**  | **Chatflow Interaction**                 |                                                                                                                                                                          |
|        | View Chatflow ID and Name                | Users can view the identifier (Chatflow ID) and the name of the chatflows they have access to. This helps in identifying and selecting the correct chatflow for their tasks. |
|        | Call Chatflow (if sufficient credit)     | Users can make calls to or interact with their assigned chatflows, provided they have sufficient credit. Each interaction or call may consume a certain amount of credit. |
|        | **Credit Management**                    |                                                                                                                                                                          |
|        | View Credit (via Accounting Service - External) | Users can view their available credit balance. This information is typically sourced from an external accounting service integrated with the Flowise-Proxy-Service. |

## 3. Key Principles

* **Principle of Least Privilege (PoLP):** The system should be designed to grant users only the permissions essential to perform their duties. This minimizes potential security risks and operational errors.
* **Clear Documentation:** Maintaining clear and updated documentation of roles and permissions is vital for administrators and users to understand their capabilities and limitations within the system.

## 4. Future Considerations (General Best Practices)

While this document outlines the current roles and permissions, it's good practice to regularly review and update these based on evolving system needs and security considerations. This might include:

* **More Granular Permissions:** Introducing more detailed permissions within roles if required.
* **Audit Trails:** Implementing audit logs for actions performed by administrators and users, especially concerning permission changes and chatflow assignments.
* **Role and Permission Reviews:** Periodically reviewing user roles and their assigned permissions to ensure they remain appropriate.

This documentation serves as a guide for understanding the fundamental roles and permissions within the Flowise-Proxy-Service. For specific operational procedures, please refer to the relevant user manuals or contact system support.
