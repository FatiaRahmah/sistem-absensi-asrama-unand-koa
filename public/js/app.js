/* ==========================================================================
   Portal Asrama UNAND - Application & Auth Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  activeView: 'view-camera',

  init() {
    this.setupLoginForm();
    this.setupNavigation();
    this.setupFormHandlers();
    this.setupModalHandlers();

    // Check initial authentication state
    this.checkAuthState();

    // Init camera module
    CameraModule.init();

    console.log("✅ UNAND Portal Asrama App & Auth Controller Initialized");
  },

  /* Auth State Check */
  checkAuthState() {
    const loginOverlay = document.getElementById('login-screen-overlay');
    const appContainer = document.querySelector('.app-container');

    if (!AppData.sessionUser) {
      if (loginOverlay) loginOverlay.style.display = 'flex';
      if (appContainer) appContainer.style.display = 'none';
      CameraModule.stopWebcam();
    } else {
      if (loginOverlay) loginOverlay.style.display = 'none';
      if (appContainer) appContainer.style.display = 'flex';
      this.applyUserSession(AppData.sessionUser);
    }
  },

  /* Setup Login Form & Quick Demo Chips */
  setupLoginForm() {
    const formLogin = document.getElementById('form-login');
    const inputNim = document.getElementById('login-nim');
    const inputPass = document.getElementById('login-password');
    const btnTogglePass = document.getElementById('btn-toggle-password');

    if (formLogin) {
      formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const nimVal = inputNim.value.trim();
        const passVal = inputPass.value.trim();
        this.login(nimVal, passVal);
      });
    }

    if (btnTogglePass && inputPass) {
      btnTogglePass.addEventListener('click', () => {
        const isPassword = inputPass.type === 'password';
        inputPass.type = isPassword ? 'text' : 'password';
        btnTogglePass.textContent = isPassword ? 'Sembunyikan' : 'Tampilkan';
      });
    }

    // Quick demo login chip buttons
    document.querySelectorAll('.demo-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const demoNim = btn.getAttribute('data-nim');
        const demoPass = btn.getAttribute('data-pass');
        if (inputNim) inputNim.value = demoNim;
        if (inputPass) inputPass.value = demoPass;
        this.login(demoNim, demoPass);
      });
    });

    // Logout button handler
    const btnLogout = document.getElementById('btn-logout-header');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => this.logout());
    }
  },

  login(nim, password) {
    const account = AppData.accounts.find(a => a.nim === nim && a.password === password);

    if (account) {
      AppData.sessionUser = account;
      this.checkAuthState();
      showToast(`Selamat datang kembali, ${account.name}!`, "success");
    } else {
      showToast("NIM / Password tidak valid! Silakan periksa kembali.", "danger");
    }
  },

  logout() {
    AppData.sessionUser = null;
    this.checkAuthState();
    showToast("Anda telah keluar dari sistem.", "info");
  },

  /* Apply Authenticated User Session permissions & UI */
  applyUserSession(user) {
    // Update Top Right Profile UI
    const userNameEl = document.getElementById('user-profile-name');
    const userRoleEl = document.getElementById('user-profile-role');
    const userAvatarEl = document.getElementById('user-profile-avatar');

    if (userNameEl) userNameEl.textContent = user.name;
    if (userRoleEl) userRoleEl.textContent = user.roleTitle;
    if (userAvatarEl) userAvatarEl.src = user.avatar;

    // Filter Sidebar Navigation Items based on user role
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      const targetView = item.getAttribute('data-view');
      const isAllowed = user.allowedViews.includes(targetView);
      item.style.display = isAllowed ? 'flex' : 'none';
    });

    // Navigate to default view for this role
    const defaultView = user.allowedViews[0];
    this.navigateToView(defaultView);

    // Render Data matching role
    this.renderAllViews();
  },

  /* Navigation handling */
  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetViewId = item.getAttribute('data-view');
        if (targetViewId) {
          this.navigateToView(targetViewId);
        }
      });
    });
  },

  navigateToView(targetViewId) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(n => {
      n.classList.toggle('active', n.getAttribute('data-view') === targetViewId);
    });

    document.querySelectorAll('.view-page').forEach(page => {
      page.classList.remove('active-view');
    });

    const targetPage = document.getElementById(targetViewId);
    if (targetPage) {
      targetPage.classList.add('active-view');
      this.activeView = targetViewId;
    }

    if (targetViewId === 'view-camera') {
      CameraModule.startWebcam();
    } else {
      CameraModule.stopWebcam();
    }
  },

  /* Render Data across all views */
  renderAllViews() {
    this.renderRiwayatTable();
    this.renderAdminMasterTable();
    this.renderAdminFacilitatorsTable();
    this.renderFacilitatorQueue();
    this.renderFacilitatorMonitoring();
  },

  /* View 1: Riwayat Presensi (Penghuni sees private, Fasil/Admin sees full) */
  renderRiwayatTable(filter = 'Semua') {
    const tbody = document.getElementById('tbody-riwayat');
    if (!tbody) return;

    const role = AppData.sessionUser ? AppData.sessionUser.role : 'penghuni';
    let data = role === 'penghuni' ? AppData.riwayatPenghuniPrivate : AppData.riwayatPresensi;

    if (filter === 'Hadir Sesi') {
      data = data.filter(d => d.statusCode === 'hadir');
    } else if (filter === 'Pengajuan Izin') {
      data = data.filter(d => d.statusCode !== 'hadir');
    }

    tbody.innerHTML = data.map(item => {
      let badgeClass = 'success';
      let iconAction = `<button class="btn btn-outline btn-sm" onclick="App.openDetailModal('${item.id}')">Bukti</button>`;

      if (item.statusCode === 'hadir') {
        badgeClass = 'success';
        iconAction = `<button class="btn btn-outline btn-sm" onclick="App.openDetailModal('${item.id}')">Bukti</button>`;
      } else if (item.statusCode === 'izin') {
        badgeClass = 'info';
        iconAction = `<button class="btn btn-outline btn-sm" onclick="App.openFileModal('${item.fileName || 'Surat_Izin.pdf'}')">PDF</button>`;
      } else if (item.statusCode === 'pending') {
        badgeClass = 'warning';
        iconAction = `<button class="btn btn-outline btn-sm" onclick="App.openDetailModal('${item.id}')">Detail</button>`;
      } else if (item.statusCode === 'ditolak') {
        badgeClass = 'danger';
        iconAction = `<button class="btn btn-outline btn-sm" onclick="App.openDetailModal('${item.id}')">Alasan</button>`;
      }

      return `
        <tr>
          <td>
            <strong>${item.tanggal}</strong><br/>
            <span style="font-size: 11px; color: var(--text-muted);">${item.sesi}</span>
          </td>
          <td>
            <div style="font-weight: 600; font-size: 12px;">${item.waktuBukti}</div>
          </td>
          <td>
            <span class="status-pill ${badgeClass}">
              <span class="dot"></span> ${item.status}
            </span>
          </td>
          <td>${iconAction}</td>
        </tr>
      `;
    }).join('');
  },

  /* View 2: Admin Master Data - Students */
  renderAdminMasterTable(searchQuery = '') {
    const tbody = document.getElementById('tbody-admin-master');
    if (!tbody) return;

    let data = AppData.studentsMaster;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(s => s.nama.toLowerCase().includes(q) || s.nim.includes(q));
    }

    tbody.innerHTML = data.map(s => {
      const initials = s.nama.split(' ').map(n => n[0]).join('').substring(0, 2);
      const avatarHtml = s.avatar
        ? `<img src="${s.avatar}" class="avatar-sm" alt="${s.nama}" />`
        : `<div class="avatar-initials">${initials}</div>`;

      let badgeClass = s.statusCode === 'aktif' ? 'success' : (s.statusCode === 'cuti' ? 'warning' : 'danger');

      return `
        <tr>
          <td><input type="checkbox" class="student-checkbox" /></td>
          <td>
            <div class="user-table-cell">
              ${avatarHtml}
              <div>
                <h5>${s.nama}</h5>
                <p>${s.nim}</p>
              </div>
            </div>
          </td>
          <td>
            <strong>${s.fakultas}</strong><br/>
            <span style="font-size: 11px; color: var(--text-muted);">${s.fakultasDetail}</span>
          </td>
          <td>
            <span style="font-weight: 700; color: var(--primary);">${s.kamar}</span>
          </td>
          <td>
            <strong>${s.fasilitator}</strong>
          </td>
          <td>
            <span class="status-pill ${badgeClass}">
              <span class="dot"></span> ${s.status}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  },

  /* View 2: Admin Master Data - Facilitators */
  renderAdminFacilitatorsTable() {
    const tbody = document.getElementById('tbody-admin-facilitators');
    if (!tbody) return;

    tbody.innerHTML = AppData.facilitatorsMaster.map(f => `
      <tr>
        <td>
          <div style="font-weight:700; color:var(--text-primary);">${f.nama}</div>
          <div style="font-size:11px; color:var(--text-muted);">NIP: ${f.nip}</div>
        </td>
        <td><strong>${f.gedung}</strong></td>
        <td><span class="pill-badge-green">${f.binaanCount} Mahasiswa</span></td>
        <td>${f.phone}</td>
        <td><span class="status-pill success"><span class="dot"></span> ${f.status}</span></td>
      </tr>
    `).join('');
  },

  /* View 4: Facilitator Approval Queue Cards */
  renderFacilitatorQueue() {
    const queueContainer = document.getElementById('facilitator-approval-queue');
    if (!queueContainer) return;

    if (AppData.approvalQueue.length === 0) {
      queueContainer.innerHTML = `
        <div style="grid-column: span 2; text-align: center; padding: 24px; color: var(--text-muted);">
          Semua pengajuan izin telah selesai diproses.
        </div>
      `;
      return;
    }

    queueContainer.innerHTML = AppData.approvalQueue.map(item => `
      <div class="approval-card" id="card-${item.id}">
        <div class="approval-user">
          <div class="user-table-cell">
            <img src="${item.avatar}" class="avatar-sm" alt="${item.nama}" />
            <div>
              <h5>${item.nama} <span class="badge-tag formal" style="font-size: 10px; text-transform:none; margin-left: 4px;">${item.kategori}</span></h5>
              <p>NIM ${item.nim} • ${item.kamar}</p>
            </div>
          </div>
          <span style="font-size: 11px; font-weight: 700; color: var(--text-muted);">${item.waktu}</span>
        </div>
        <div class="approval-reason">
          "${item.alasan}"
        </div>
        <div class="approval-file">
          <span>📄 ${item.fileName}</span>
          <button class="btn btn-outline btn-sm" onclick="App.openFileModal('${item.fileName}')">Pratinjau</button>
        </div>
        <div class="btn-row" style="margin-top: 10px;">
          <button class="btn btn-primary btn-sm btn-block" onclick="App.approveLeave('${item.id}')">Setujui Izin</button>
          <button class="btn btn-outline btn-sm btn-block" style="color:#dc2626;" onclick="App.rejectLeave('${item.id}')">Tolak Izin</button>
        </div>
      </div>
    `).join('');
  },

  /* View 4: Facilitator Shubuh Monitoring Table */
  renderFacilitatorMonitoring(searchQuery = '') {
    const tbody = document.getElementById('tbody-facilitator-monitoring');
    if (!tbody) return;

    let data = AppData.monitoringShubuh;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(d => d.nama.toLowerCase().includes(q) || d.nim.includes(q));
    }

    tbody.innerHTML = data.map(m => {
      const avatarHtml = m.foto
        ? `<img src="${m.foto}" class="avatar-sm" alt="${m.nama}" />`
        : `<div class="avatar-initials" style="background:#e2e8f0; color:#475569;">${m.initials}</div>`;

      let badgeClass = 'success';
      if (m.statusCode === 'alpa') badgeClass = 'danger';
      if (m.statusCode === 'izin') badgeClass = 'info';

      const photoThumb = m.foto
        ? `<img src="${m.foto}" style="width:36px; height:36px; border-radius:6px; object-fit:cover;" />`
        : `<div style="width:36px; height:36px; border-radius:6px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:12px;">No Foto</div>`;

      let actionBtn = `<button class="btn btn-outline btn-sm" onclick="showToast('Catatan disimpan', 'info')">Catatan</button>`;
      if (m.statusCode === 'alpa') {
        actionBtn = `<button class="btn btn-outline btn-sm" style="color:#b91c1c;" onclick="showToast('Penghuni ditandai Alpa', 'warning')">Tandai Alpa</button>`;
      } else if (m.statusCode === 'izin') {
        actionBtn = `<button class="btn btn-outline btn-sm" style="color:#1d4ed8;" onclick="App.openDetailModal('HIST-003')">Periksa</button>`;
      }

      return `
        <tr>
          <td>
            <div class="user-table-cell">
              ${avatarHtml}
              <div>
                <h5>${m.nama}</h5>
                <p>${m.nim}</p>
              </div>
            </div>
          </td>
          <td>
            <strong>${m.kamar}</strong>
          </td>
          <td>
            <strong>${m.waktu}</strong><br/>
            <span style="font-size: 11px; color: var(--text-muted);">${m.subtext}</span>
          </td>
          <td>${photoThumb}</td>
          <td>
            <span class="status-pill ${badgeClass}">
              <span class="dot"></span> ${m.status}
            </span>
          </td>
          <td>
            <div style="display:flex; align-items:center; gap:6px;">
              ${actionBtn}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  /* Form Submission Handlers */
  setupFormHandlers() {
    // Session tile selection
    const sessionTiles = document.querySelectorAll('.session-tile');
    sessionTiles.forEach(tile => {
      tile.addEventListener('click', () => {
        sessionTiles.forEach(t => t.classList.remove('selected'));
        tile.classList.add('selected');
      });
    });

    // Character counter for textarea
    const textarea = document.getElementById('keterangan-izin');
    const charCounter = document.getElementById('char-count');
    if (textarea && charCounter) {
      textarea.addEventListener('input', () => {
        charCounter.textContent = `${textarea.value.length} / 300 karakter`;
      });
    }

    // Submit Permohonan Izin (Penghuni)
    const formIzin = document.getElementById('form-permohonan-izin');
    if (formIzin) {
      formIzin.addEventListener('submit', (e) => {
        e.preventDefault();

        const newRecord = {
          id: `HIST-00${AppData.riwayatPenghuniPrivate.length + 1}`,
          tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          sesi: "Shubuh (04.00-06.00)",
          metode: "Permohonan Izin Mandiri",
          waktuBukti: `Diajukan ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
          status: "Menunggu Persetujuan",
          statusCode: "pending",
          fileName: "Surat_Izin_Pengajuan.pdf",
          detail: textarea ? textarea.value : "Permohonan izin baru"
        };

        AppData.riwayatPenghuniPrivate.unshift(newRecord);
        this.renderRiwayatTable();
        showToast("Pengajuan izin berhasil dikirim ke Fasilitator!", "success");
      });
    }

    // Add Student Form (Admin)
    const formQuickStudent = document.getElementById('form-quick-student');
    if (formQuickStudent) {
      formQuickStudent.addEventListener('submit', (e) => {
        e.preventDefault();
        const nama = document.getElementById('quick-nama').value;
        const nim = document.getElementById('quick-nim').value;
        const kamar = document.getElementById('quick-kamar').value;
        const fasil = document.getElementById('quick-fasil').value;

        AppData.studentsMaster.unshift({
          nim,
          nama,
          fakultas: "Teknologi Informasi",
          fakultasDetail: "Fakultas Teknologi Informasi",
          kamar: `Blok A - Lt. 2 (Kmr ${kamar})`,
          fasilitator: fasil || "Ust. Ilham Ramadhan, S.Kom.",
          status: "Aktif",
          statusCode: "aktif",
          avatar: ""
        });

        this.renderAdminMasterTable();
        showToast(`Penghuni baru "${nama}" berhasil ditambahkan!`, "success");
        formQuickStudent.reset();
      });
    }

    // Add Facilitator Form (Admin Modal)
    const formAddFasil = document.getElementById('form-add-fasilitator');
    if (formAddFasil) {
      formAddFasil.addEventListener('submit', (e) => {
        e.preventDefault();
        const nama = document.getElementById('fasil-nama').value;
        const nip = document.getElementById('fasil-nip').value;
        const gedung = document.getElementById('fasil-gedung').value;
        const phone = document.getElementById('fasil-phone').value;

        AppData.facilitatorsMaster.unshift({
          id: `FAS-00${AppData.facilitatorsMaster.length + 1}`,
          nip,
          nama,
          gedung,
          binaanCount: 30,
          phone,
          status: "Aktif"
        });

        this.renderAdminFacilitatorsTable();
        this.closeAllModals();
        showToast(`Fasilitator baru "${nama}" berhasil ditambahkan!`, "success");
        formAddFasil.reset();
      });
    }

    // Search input handlers
    const searchAdmin = document.getElementById('search-admin-input');
    if (searchAdmin) {
      searchAdmin.addEventListener('input', (e) => {
        this.renderAdminMasterTable(e.target.value);
      });
    }

    const searchFasil = document.getElementById('search-fasil-input');
    if (searchFasil) {
      searchFasil.addEventListener('input', (e) => {
        this.renderFacilitatorMonitoring(e.target.value);
      });
    }

    // Filter tabs for Riwayat Presensi
    const filterTabs = document.querySelectorAll('#filter-tabs-riwayat .filter-tab');
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderRiwayatTable(tab.textContent.trim());
      });
    });

    // Sub tabs for Admin Panel (Data Penghuni vs Data Fasilitator)
    const adminSubTabs = document.querySelectorAll('#admin-sub-tabs .filter-tab');
    adminSubTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        adminSubTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const tabTarget = tab.getAttribute('data-tab');
        const secStudents = document.getElementById('sec-admin-students');
        const secFasil = document.getElementById('sec-admin-facilitators');

        if (tabTarget === 'fasilitator') {
          if (secStudents) secStudents.style.display = 'none';
          if (secFasil) secFasil.style.display = 'block';
        } else {
          if (secStudents) secStudents.style.display = 'block';
          if (secFasil) secFasil.style.display = 'none';
        }
      });
    });
  },

  /* Approval Actions (Facilitator) */
  approveLeave(id) {
    AppData.approvalQueue = AppData.approvalQueue.filter(item => item.id !== id);
    this.renderFacilitatorQueue();
    showToast("Permohonan izin disetujui", "success");
  },

  rejectLeave(id) {
    AppData.approvalQueue = AppData.approvalQueue.filter(item => item.id !== id);
    this.renderFacilitatorQueue();
    showToast("Permohonan izin ditolak", "danger");
  },

  /* Modals Controller */
  setupModalHandlers() {
    document.querySelectorAll('.modal-close-trigger').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeAllModals();
      });
    });
  },

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  },

  openDetailModal(id) {
    const role = AppData.sessionUser ? AppData.sessionUser.role : 'penghuni';
    const list = role === 'penghuni' ? AppData.riwayatPenghuniPrivate : AppData.riwayatPresensi;
    const item = list.find(r => r.id === id);
    if (!item) return;

    const modalBody = document.getElementById('modal-detail-body');
    if (modalBody) {
      modalBody.innerHTML = `
        <div style="font-size: 13px; line-height: 1.6;">
          <p><strong>ID Record:</strong> ${item.id}</p>
          <p><strong>Tanggal & Sesi:</strong> ${item.tanggal} • ${item.sesi}</p>
          <p><strong>Metode Validasi:</strong> ${item.metode}</p>
          <p><strong>Waktu / Keterangan:</strong> ${item.waktuBukti}</p>
          <p><strong>Status:</strong> <span class="status-pill success"><span class="dot"></span> ${item.status}</span></p>
          <hr style="margin: 12px 0; border: none; border-top: 1px solid var(--border-color);" />
          <p><strong>Rincian Detail:</strong></p>
          <div style="background: var(--bg-subtle); padding: 10px; border-radius: 6px; font-style: italic; margin-top: 6px;">
            "${item.detail || '-'}"
          </div>
        </div>
      `;
    }

    document.getElementById('modal-detail-record').classList.add('active');
  },

  openFileModal(fileName) {
    const modalBody = document.getElementById('modal-file-body');
    if (modalBody) {
      modalBody.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <h4 style="font-size: 15px; font-weight: 800; color: var(--text-primary);">${fileName}</h4>
          <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Dokumen Terverifikasi Digital oleh Universitas Andalas</p>
          <div style="margin-top: 20px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 30px;">
            <p style="font-size: 13px; color: #475569;">[Pratinjau Dokumen PDF / Surat Keterangan Resmi]</p>
            <span style="font-size: 11px; color: #94a3b8;">Format: Portable Document Format (1.2 MB)</span>
          </div>
        </div>
      `;
    }
    document.getElementById('modal-file-preview').classList.add('active');
  },

  openAddFasilModal() {
    document.getElementById('modal-add-fasilitator').classList.add('active');
  }
};

/* Global Toast Notification System */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<div>${message}</div>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* Biometric Verification Modal helper */
function openVerificationSuccessModal(dataUrl) {
  const modalBody = document.getElementById('modal-verification-body');
  if (modalBody) {
    modalBody.innerHTML = `
      <div style="text-align: center;">
        <img src="${dataUrl}" style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary); margin-bottom: 14px;" />
        <h3 style="font-size: 17px; font-weight: 800; color: var(--primary);">PRESENSI BERHASIL DITERIMA</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Skor biometrik liveness: <strong>98.4% (Match)</strong></p>
        <div style="background: var(--primary-light); padding: 10px; border-radius: 8px; font-size: 12px; color: var(--primary-dark); font-weight: 700; margin-top: 14px;">
          📍 Geolokasi Kampus Limau Manis (Lat: -0.9154, Long: 100.4589)
        </div>
      </div>
    `;
  }
  document.getElementById('modal-verification-success').classList.add('active');
  showToast("Presensi berhasil dicatat!", "success");
}
