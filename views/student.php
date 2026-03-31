<!DOCTYPE html>
<html lang="uk">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PVI_lab01</title>
    <link rel="stylesheet" href="public/css/style.css">
    <link rel="manifest" href="public/manifest.json">
</head>

<body>
    <header class="main-header">
        <div class="left-part">
            <button class="burger" aria-label="Open menu">☰</button>
            <a href="index.php?page=student" class="logo">CMS</a>
        </div>

        <div class="header-controls">
            <?php if ($isLoggedIn): ?>
                <div class="notification-wrapper" tabindex="0" role="button" aria-label="Notifications">
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor"
                        class="bell-icon" viewBox="0 0 16 16">
                        <path
                            d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4 4 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4 4 0 0 0-3.203-3.92zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5 5 0 0 1 13 6c0 .88.32 4.2 1.22 6" />
                    </svg>
                    <span class="notification-indicator" aria-hidden="true"></span>

                    <div class="notification-dropdown">
                        <ul class="notification-list">
                            <li class="notification-item">
                                <img src="public/image/avatar.jpg" alt="User avatar" class="other-avatar-image">
                                <div class="user-block">
                                    <span class="notification-name">Daryna</span>
                                    <p class="notification-text">Lorem ipsum dolor sit amet elit.</p>
                                </div>
                            </li>
                            <li class="notification-item">
                                <img src="public/image/avatar.jpg" alt="Admin avatar" class="other-avatar-image">
                                <div class="user-block">
                                    <span class="notification-name">Admin</span>
                                    <p class="notification-text">Lorem ipsum dolor sit amet elit.</p>
                                </div>
                            </li>
                            <li class="notification-item">
                                <img src="public/image/avatar.jpg" alt="User avatar" class="other-avatar-image">
                                <div class="user-block">
                                    <span class="notification-name">Ivan</span>
                                    <p class="notification-text">Lorem ipsum dolor sit amet elit.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

                <div class="user-profile">
                    <img src="public/image/avatar.jpg" alt="Your avatar" class="avatar-image">
                    <span class="user-name">
                        <?= htmlspecialchars($_SESSION['user']['firstname'] . ' ' . $_SESSION['user']['lastname']) ?>
                    </span>

                    <div class="user-dropdown">
                        <ul class="user-dropdown-list">
                            <li><a href="#">Profile</a></li>
                            <li><a href="index.php?page=logout">LogOut</a></li>
                        </ul>
                    </div>
                </div>
            <?php else: ?>
                <button class="btn-login-header" onclick="openLoginModal()">LogIn</button>
            <?php endif; ?>
        </div>
    </header>

    <div class="main-container">
        <nav class="sidebar" aria-label="Main navigation">
            <ul class="nav-list">
                <li><a href="index.php?page=dashboard">Dashboard</a></li>
                <li><a href="index.php?page=student" class="active" aria-current="page">Students</a></li>
                <li><a href="index.php?page=task">Tasks</a></li>
            </ul>
        </nav>

        <main class="student-content">
            <h1 class="title">Students</h1>
            <div class="button-on-table">
                <button class="btn-add" aria-label="Add student"
                    onclick="<?= $isLoggedIn ? 'openAddModal()' : 'openLoginModal()' ?>">+</button>
                <button class="btn-delete-all"
                    onclick="<?= $isLoggedIn ? 'confirmDeleteAll()' : 'openLoginModal()' ?>">Delete</button>
            </div>
            <div class="table-wrapper">
                <table class="students-table">
                    <thead>
                        <tr>
                            <th scope="col">
                                <input type="checkbox" id="select-all" aria-label="Select all students">
                                <p id="select-all-label">Select all</p>
                            </th>
                            <th scope="col">Group</th>
                            <th scope="col">Name</th>
                            <th scope="col">Gender</th>
                            <th scope="col">Birthday</th>
                            <th scope="col">Status</th>
                            <th scope="col">Options</th>
                        </tr>
                    </thead>
                    <tbody id="students-table-body">
                        
                    </tbody>
                </table>
            </div>

            <div class="pagination" id="pagination-container" aria-label="Pagination"></div>
        </main>
    </div>

    <div class="modal-overlay" id="add-modal" aria-hidden="true">
        <div class="modal-window" role="dialog" aria-labelledby="add-modal-title" aria-modal="true">
            <div class="modal-header">
                <h2 class="modal-title" id="add-modal-title">Add student</h2>
                <button class="btn-close" id="close-add-modal" aria-label="Close modal">&times;</button>
            </div>
            <div class="modal-body">
                <form id="add-student-form">
                    <input type="hidden" id="student-id">

                    <div class="form-group">
                        <label for="group">Group</label>
                        <select id="group" class="form-control" required aria-label="Select group">
                            <option value="" disabled selected>Select Group</option>
                            <option value="PZ-21">PZ-21</option>
                            <option value="PZ-22">PZ-22</option>
                            <option value="PZ-23">PZ-23</option>
                            <option value="PZ-24">PZ-24</option>
                            <option value="PZ-25">PZ-25</option>
                            <option value="PZ-26">PZ-26</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="first-name">First Name</label>
                        <div class="input-wrapper">
                            <input type="text" id="first-name" class="form-control"
                                pattern="^[A-Za-zА-Яа-яЇїЄєІіҐґ\-]+$" required aria-label="First name">
                            <span class="error-text" aria-live="polite">Введіть коректне ім'я</span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="last-name">Last Name</label>
                        <div class="input-wrapper">
                            <input type="text" id="last-name" class="form-control" pattern="^[A-Za-zА-Яа-яЇїЄєІіҐґ\-]+$"
                                required aria-label="Last name">
                            <span class="error-text" aria-live="polite">Введіть коректне прізвище</span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="gender">Gender</label>
                        <select id="gender" class="form-control" required aria-label="Select gender">
                            <option value="" disabled selected>Select Gender</option>
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="birthday">Birthday</label>
                        <div class="input-wrapper">
                            <input type="date" id="birthday" class="form-control" min="1950-01-01" max="2010-12-31"
                                required aria-label="Birthday">
                            <span class="error-text" aria-live="polite">Введіть дату в межах 1950–2010</span>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel" id="cancel-add">Cancel</button>
                <button type="submit" form="add-student-form" class="btn-create" data-mode="create">Create</button>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="delete-modal" aria-hidden="true">
        <div class="modal-window" role="dialog" aria-labelledby="delete-modal-title" aria-modal="true">
            <div class="modal-header">
                <h2 class="modal-title" id="delete-modal-title">Warning</h2>
                <button class="btn-close" id="close-delete-modal" aria-label="Close modal">&times;</button>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to delete <span id="delete-user-name">USER</span>?</p>
            </div>
            <div class="modal-footer">
                <button class="modal-btn-cancel" id="cancel-delete">Cancel</button>
                <button class="modal-btn-delete" id="confirm-delete">Ok</button>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="login-modal" aria-hidden="true" style="display: none;">
        <div class="modal-window" role="dialog">
            <div class="modal-header">
                <h2 class="modal-title">Authentication</h2>
                <button class="btn-close" onclick="closeLoginModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="login-form" action="index.php?action=login" method="POST">
                    <div class="form-group">
                        <label>Login</label>
                        <input type="text" name="username" class="form-control" placeholder="Ivan Ivanov" required>
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <div class="password-wrapper">
                            <input type="password" name="password" id="login-password" class="form-control"
                                placeholder="01.01.2001" required>
                            <button type="button" class="btn-toggle-password"
                                onclick="togglePasswordVisibility('login-password', this)">
                                <svg class="eye-open" xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                                    fill="currentColor" viewBox="0 0 16 16">
                                    <path
                                        d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z" />
                                    <path
                                        d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0" />
                                </svg>
                                <svg class="eye-closed" style="display: none;" xmlns="http://www.w3.org/2000/svg"
                                    width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                    <path
                                        d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7 7 0 0 0-2.79.588l.77.771A6 6 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755q-.247.248-.517.486z" />
                                    <path
                                        d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829zm-4.783 1.912-.132.132a1.2 1.2 0 0 1-.165.165 2.5 2.5 0 0 1-2.829-2.829l-.823-.823a3.5 3.5 0 0 0 4.474 4.474l-.13.13z" />
                                    <path
                                        d="M3.35 5.47q-.27.24-.518.487A13 13 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7 7 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238zm3.228 1.09a3 3 0 0 0 3.602 3.602l-.664-.664a2 2 0 0 1-2.274-2.274z" />
                                    <path
                                        d="M14.793 14.793a.5.5 0 0 1-.707 0l-14-14a.5.5 0 0 1 .707-.707l14 14a.5.5 0 0 1 0 .707" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-login-cancel" onclick="closeLoginModal()">Cancel</button>
                <button type="submit" form="login-form" class="btn-login">Log In</button>
            </div>
        </div>
    </div>

    <script src="public/js/script.js"></script>
</body>

</html>