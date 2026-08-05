<template>
  <div class="space-y-6">
    <!-- Header Page -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Kartu Santri & Pusat QR Code</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Desain Kartu Resmi <span class="font-bold text-blue-600 dark:text-blue-400">Skill Village</span> (Nama Santri di Sisi Belakang anti Salah Cetak).
        </p>
      </div>

      <div class="flex items-center space-x-2">
        <router-link
          to="/master/santri"
          class="px-3.5 py-2.5 rounded-xl neu-btn text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center space-x-1.5 transition active:scale-95"
        >
          <ArrowLeft class="w-4 h-4" />
          <span>Kembali ke Data Santri</span>
        </router-link>
      </div>
    </div>

    <!-- Main Navigation Tabs -->
    <div class="p-1.5 neu-inset rounded-2xl flex space-x-2">
      <button
        type="button"
        @click="activeTab = 'template'"
        :class="[
          'px-5 py-3 text-xs font-bold rounded-xl transition-all flex-1 text-center flex items-center justify-center space-x-2',
          activeTab === 'template'
            ? 'neu-card text-blue-600 dark:text-blue-400 font-extrabold shadow-md'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
        ]"
      >
        <LayoutTemplate class="w-4 h-4" />
        <span>1. Template & Desain Kartu (CR80 Print-Ready)</span>
      </button>

      <button
        type="button"
        @click="activeTab = 'cetak'"
        :class="[
          'px-5 py-3 text-xs font-bold rounded-xl transition-all flex-1 text-center flex items-center justify-center space-x-2',
          activeTab === 'cetak'
            ? 'neu-card text-blue-600 dark:text-blue-400 font-extrabold shadow-md'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
        ]"
      >
        <Printer class="w-4 h-4" />
        <span>2. Cetak Kartu & QR Code Massal (PDF A4 Grid 2x5)</span>
      </button>
    </div>

    <!-- TAB 1: TEMPLATE & DESAIN KARTU -->
    <div v-if="activeTab === 'template'" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Editor Form -->
      <div class="lg:col-span-6 space-y-6">
        <div class="neu-card p-6 rounded-2xl space-y-5 border border-slate-200/60 dark:border-slate-800">
          <div class="border-b border-slate-200/60 dark:border-slate-800 pb-3 flex items-center justify-between">
            <h3 class="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders class="w-4 h-4 text-blue-500" />
              Pengaturan Atribut Kartu
            </h3>
            <button
              type="button"
              @click="saveTemplateSettings"
              :disabled="savingSettings"
              class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-blue-600/20 active:scale-95 transition"
            >
              <Save class="w-3.5 h-3.5" />
              <span>{{ savingSettings ? 'Menyimpan...' : 'Simpan Template' }}</span>
            </button>
          </div>

          <!-- Upload TTD & Stempel -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Gambar TTD Pengurus (PNG)</label>
              <div class="relative p-3 rounded-xl neu-inset text-center space-y-2">
                <div class="h-16 flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-800">
                  <img v-if="settings.card_ttd_url" :src="getPublicImageUrl(settings.card_ttd_url)" class="max-h-full max-w-full object-contain" />
                  <span v-else class="text-[10px] text-slate-400">Belum ada TTD</span>
                </div>
                <input type="file" ref="ttdInput" accept="image/*" @change="uploadImage($event, 'card_ttd_url')" class="hidden" />
                <button
                  type="button"
                  @click="$refs.ttdInput.click()"
                  :disabled="uploadingKey === 'card_ttd_url'"
                  class="w-full py-1.5 rounded-lg neu-btn text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center space-x-1"
                >
                  <Upload class="w-3.5 h-3.5" />
                  <span>{{ uploadingKey === 'card_ttd_url' ? 'Mengunggah...' : 'Upload TTD' }}</span>
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Gambar Cap Stempel (PNG)</label>
              <div class="relative p-3 rounded-xl neu-inset text-center space-y-2">
                <div class="h-16 flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-800">
                  <img v-if="settings.card_stempel_url" :src="getPublicImageUrl(settings.card_stempel_url)" class="max-h-full max-w-full object-contain" />
                  <span v-else class="text-[10px] text-slate-400">Belum ada Cap</span>
                </div>
                <input type="file" ref="stempelInput" accept="image/*" @change="uploadImage($event, 'card_stempel_url')" class="hidden" />
                <button
                  type="button"
                  @click="$refs.stempelInput.click()"
                  :disabled="uploadingKey === 'card_stempel_url'"
                  class="w-full py-1.5 rounded-lg neu-btn text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center space-x-1"
                >
                  <Upload class="w-3.5 h-3.5" />
                  <span>{{ uploadingKey === 'card_stempel_url' ? 'Mengunggah...' : 'Upload Cap' }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- KONTROL USER FRIENDLY: MOTTO / SLOGAN -->
          <div class="p-4 rounded-xl neu-inset space-y-3 border border-slate-200/80 dark:border-slate-800">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Move class="w-3.5 h-3.5" />
                Atur Ukuran & Posisi Motto
              </span>
              <button type="button" @click="resetMottoPosition" class="text-[10px] font-bold text-slate-500 hover:text-emerald-600 flex items-center gap-1">
                <RotateCcw class="w-3 h-3" /> Reset Motto
              </button>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Ukuran Teks: {{ settings.card_motto_scale }}%</label>
                <input v-model.number="settings.card_motto_scale" type="range" min="10" max="500" step="5" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Posisi Kiri/Kanan: {{ settings.card_motto_offset_x }}px</label>
                <input v-model.number="settings.card_motto_offset_x" type="range" min="-60" max="60" step="2" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Posisi Atas/Bawah: {{ settings.card_motto_offset_y }}px</label>
                <input v-model.number="settings.card_motto_offset_y" type="range" min="-60" max="60" step="2" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
              </div>
            </div>
          </div>

          <!-- KONTROL USER FRIENDLY: TTD PENGURUS -->
          <div class="p-4 rounded-xl neu-inset space-y-3 border border-slate-200/80 dark:border-slate-800">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Move class="w-3.5 h-3.5" />
                Atur Ukuran & Posisi TTD
              </span>
              <button type="button" @click="resetTtdPosition" class="text-[10px] font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1">
                <RotateCcw class="w-3 h-3" /> Reset TTD
              </button>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Ukuran Gambar: {{ settings.card_ttd_scale }}%</label>
                <input v-model.number="settings.card_ttd_scale" type="range" min="10" max="500" step="5" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Posisi Kiri/Kanan: {{ settings.card_ttd_offset_x }}px</label>
                <input v-model.number="settings.card_ttd_offset_x" type="range" min="-60" max="60" step="2" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Posisi Atas/Bawah: {{ settings.card_ttd_offset_y }}px</label>
                <input v-model.number="settings.card_ttd_offset_y" type="range" min="-60" max="60" step="2" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
            </div>
          </div>

          <!-- KONTROL USER FRIENDLY: CAP STEMPEL -->
          <div class="p-4 rounded-xl neu-inset space-y-3 border border-slate-200/80 dark:border-slate-800">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Move class="w-3.5 h-3.5" />
                Atur Ukuran & Posisi Cap Stempel
              </span>
              <button type="button" @click="resetStempelPosition" class="text-[10px] font-bold text-slate-500 hover:text-amber-600 flex items-center gap-1">
                <RotateCcw class="w-3 h-3" /> Reset Cap
              </button>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Ukuran Gambar: {{ settings.card_stempel_scale }}%</label>
                <input v-model.number="settings.card_stempel_scale" type="range" min="10" max="500" step="5" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Posisi Kiri/Kanan: {{ settings.card_stempel_offset_x }}px</label>
                <input v-model.number="settings.card_stempel_offset_x" type="range" min="-60" max="60" step="2" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Posisi Atas/Bawah: {{ settings.card_stempel_offset_y }}px</label>
                <input v-model.number="settings.card_stempel_offset_y" type="range" min="-60" max="60" step="2" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600" />
              </div>
            </div>
          </div>

          <!-- TOGGLES HELPER FISIK CETAK CR80 -->
          <div class="p-3.5 rounded-xl neu-inset flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span class="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <Scissors class="w-4 h-4" />
              Bantuan Cetak Percetakan (CR80)
            </span>
            <div class="flex items-center space-x-4">
              <label class="flex items-center space-x-1.5 cursor-pointer text-[11px]">
                <input type="checkbox" v-model="showCropMarks" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span>Garis Potong (Crop Marks)</span>
              </label>
              <label class="flex items-center space-x-1.5 cursor-pointer text-[11px]">
                <input type="checkbox" v-model="showSafeArea" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span>Safe Area (-3mm)</span>
              </label>
            </div>
          </div>

          <!-- Custom Inputs -->
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Motto / Slogan Kartu Depan (Kiri Bawah)</label>
              <input v-model="settings.card_motto" type="text" placeholder="Berilmu, Beramal & Berakhlaqul Karimah" class="w-full px-3 py-2 rounded-xl text-xs neu-input bg-transparent" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Jabatan Pengurus</label>
              <input v-model="settings.card_signer_title" type="text" placeholder="misal: Kepala Pengurus Pesantren" class="w-full px-3 py-2 rounded-xl text-xs neu-input bg-transparent" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap Pejabat / Pengurus</label>
              <input v-model="settings.card_signer_name" type="text" placeholder="misal: KH. Ahmad Dahlan, M.Pd." class="w-full px-3 py-2 rounded-xl text-xs neu-input bg-transparent" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Alamat Yayasan di Kartu</label>
              <input v-model="settings.foundation_address" type="text" placeholder="Jl. Pesantren No. 1, Kediri" class="w-full px-3 py-2 rounded-xl text-xs neu-input bg-transparent" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Catatan/Himbauan Belakang Kartu</label>
              <textarea v-model="settings.card_note" rows="2" class="w-full p-2.5 rounded-xl text-xs neu-input bg-transparent resize-none"></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Live Preview ID Card -->
      <div class="lg:col-span-6 space-y-4">
        <div class="sticky top-24 neu-card p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-5">
          <div class="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-3">
            <h3 class="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles class="w-4 h-4 text-amber-500 animate-pulse" />
              Live Preview Kartu (CR80 85.6mm × 53.98mm)
            </h3>
            <span class="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/30">CR80 PVC Ready</span>
          </div>

          <div class="space-y-6">
            <!-- SISI ATAS: TAMPAK DEPAN -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                <span>1. Tampak Depan (Kartu Pelajar / Santri)</span>
                <span class="text-blue-600 font-bold flex items-center gap-1">
                  <ShieldCheck class="w-3 h-3 text-blue-500" />
                  FRONT SIDE (CR80)
                </span>
              </div>

              <!-- Canvas Kartu Ratio CR80 -->
              <div class="w-full aspect-[85.6/53.98] max-w-[440px] mx-auto bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900 rounded-xl shadow-2xl relative overflow-hidden border-2 border-slate-200 flex flex-col justify-between select-none transition-transform hover:scale-[1.01]">
                <!-- Safe Area Guide (-3mm) -->
                <div v-if="showSafeArea" class="absolute inset-[8px] border border-dashed border-red-500/50 pointer-events-none z-30 flex items-start justify-end p-1">
                  <span class="text-[7px] text-red-500 font-mono bg-white/80 px-1 rounded">Safe Area (-3mm)</span>
                </div>

                <!-- Crop Marks Percetakan (4 sudut) -->
                <div v-if="showCropMarks" class="absolute inset-0 pointer-events-none z-40">
                  <div class="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-slate-900"></div>
                  <div class="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-slate-900"></div>
                  <div class="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-slate-900"></div>
                  <div class="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-slate-900"></div>
                </div>

                <!-- WATERMARK LOGO SKILL VILLAGE -->
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                  <img src="/logo-skill-village.webp" class="w-44 h-44 object-contain opacity-[0.10] scale-95 filter drop-shadow-md" />
                </div>

                <!-- Gold & Navy Header Accent Ribbon -->
                <div class="absolute top-0 left-0 right-0 h-12 bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#1e3a8a] flex items-center justify-between px-4 z-10 border-b-2 border-amber-400/80 shadow-md">
                  <div class="flex items-center space-x-2.5">
                    <div class="w-8 h-8 rounded-xl bg-white/95 p-1 flex items-center justify-center shadow-md border border-amber-300/60 backdrop-blur-sm">
                      <img src="/logo-skill-village.webp" class="w-full h-full object-contain" />
                    </div>
                    <div>
                      <span class="font-black text-xs text-white uppercase tracking-wider block leading-none">SKILL VILLAGE</span>
                      <span class="text-[7.5px] font-bold text-amber-300 tracking-widest uppercase block mt-0.5">ISLAMIC BOARDING SCHOOL</span>
                    </div>
                  </div>
                  <div class="h-full flex items-center">
                    <div class="px-3 py-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-[#1e3a8a] font-black text-[9px] uppercase tracking-widest rounded-l-full shadow-inner border-l-2 border-white/60">
                      OFFICIAL CARD
                    </div>
                  </div>
                </div>

                <!-- Geometric Golden Corner Ribbons -->
                <div class="absolute bottom-6 right-0 w-28 h-24 bg-gradient-to-tl from-amber-400/20 via-yellow-300/10 to-transparent pointer-events-none rounded-tl-full"></div>
                <div class="absolute bottom-0 left-0 w-28 h-6 bg-[#1e3a8a] transform -skew-x-[30deg] -translate-x-6 pointer-events-none"></div>

                <!-- Main Content Body -->
                <div class="pt-13 px-4 pb-1 flex-1 flex items-start z-10 relative">
                  <div class="grid grid-cols-12 gap-3 items-start w-full pt-1">
                    <!-- Foto Santri (Kiri Atas) -->
                    <div class="col-span-4 flex flex-col items-center justify-start -mt-0.5">
                      <div class="relative p-0.5 rounded-2xl bg-gradient-to-b from-amber-400 via-yellow-300 to-amber-500 shadow-xl">
                        <div class="w-23 h-23 aspect-square rounded-[14px] border-2 border-[#1e3a8a] overflow-hidden bg-white flex items-center justify-center">
                          <User class="w-12 h-12 text-[#1e3a8a]" />
                        </div>
                      </div>
                    </div>

                    <!-- Identitas Santri Text -->
                    <div class="col-span-8 space-y-1 relative">
                      <div class="flex items-center space-x-1.5 mb-1">
                        <h2 class="text-sm font-black text-[#1e3a8a] uppercase tracking-wide leading-none">KARTU SANTRI</h2>
                        <span class="px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-[7.5px] font-black text-amber-700">AKTIF</span>
                      </div>

                      <div class="text-[9.5px] space-y-1 font-semibold text-slate-800">
                        <div class="flex items-center">
                          <span class="w-[54px] font-black text-slate-950 shrink-0">Nama</span>
                          <span class="w-3 font-black text-slate-950 shrink-0 text-left">:</span>
                          <span class="font-black text-[#1e3a8a] truncate text-[10.5px] uppercase">ABDULLAH AZZAM</span>
                        </div>
                        <div class="flex items-center">
                          <span class="w-[54px] font-black text-slate-950 shrink-0">NIS / NIK</span>
                          <span class="w-3 font-black text-slate-950 shrink-0 text-left">:</span>
                          <span class="font-black text-slate-950 font-mono text-[9px]">1002 / 320112345678</span>
                        </div>
                        <div class="flex items-center">
                          <span class="w-[54px] font-black text-slate-950 shrink-0">Jurusan</span>
                          <span class="w-3 font-black text-slate-950 shrink-0 text-left">:</span>
                          <span class="font-bold text-amber-700 truncate">Tahfidz Al-Qur'an</span>
                        </div>
                        <div class="flex items-center">
                          <span class="w-[54px] font-black text-slate-950 shrink-0">TTL</span>
                          <span class="w-3 font-black text-slate-950 shrink-0 text-left">:</span>
                          <span class="font-bold text-slate-900 truncate">Kediri, 19 Feb 2008</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- BADGE MOTTO DENGAN SLIDER TRANSFORM UKURAN 105% & POSISI 26PX / 4PX -->
                  <div class="absolute bottom-13 left-3.5 z-20 pointer-events-none">
                    <div
                      class="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400/25 via-yellow-300/40 to-amber-400/25 border border-amber-400/60 shadow-sm backdrop-blur-xs flex items-center justify-center transition-transform"
                      :style="{
                        transform: `translate(${settings.card_motto_offset_x || 26}px, ${settings.card_motto_offset_y || 4}px) scale(${(settings.card_motto_scale || 105) / 100})`
                      }"
                    >
                      <p class="text-[8.5px] italic font-black text-[#1e3a8a] leading-tight tracking-tight whitespace-nowrap">
                        "{{ settings.card_motto || 'Berilmu, Beramal & Berakhlaqul Karimah' }}"
                      </p>
                    </div>
                  </div>

                  <!-- BLOK NAMA & TTD PENGURUS -->
                  <div class="absolute bottom-1.5 right-4 flex flex-col items-end text-right z-20">
                    <div class="h-7 relative flex items-center justify-end w-full overflow-visible">
                      <!-- Cap Stempel -->
                      <img
                        v-if="settings.card_stempel_url"
                        :src="getPublicImageUrl(settings.card_stempel_url)"
                        class="absolute right-5 top-0 h-7 opacity-85 pointer-events-none object-contain transition-transform"
                        :style="{
                          transform: `translate(${settings.card_stempel_offset_x || 0}px, ${settings.card_stempel_offset_y || 0}px) scale(${(settings.card_stempel_scale || 100) / 100})`
                        }"
                      />
                      <!-- TTD -->
                      <img
                        v-if="settings.card_ttd_url"
                        :src="getPublicImageUrl(settings.card_ttd_url)"
                        class="h-7 relative z-10 object-contain transition-transform"
                        :style="{
                          transform: `translate(${settings.card_ttd_offset_x || 0}px, ${settings.card_ttd_offset_y || 0}px) scale(${(settings.card_ttd_scale || 100) / 100})`
                        }"
                      />
                    </div>
                    <p class="text-[8px] font-black text-[#1e3a8a] underline leading-none">{{ settings.card_signer_name || 'KH. Ahmad Dahlan, M.Pd.' }}</p>
                    <p class="text-[6.5px] text-slate-500 font-bold mt-0.5">{{ settings.card_signer_title || 'Kepala Pengurus Pesantren' }}</p>
                  </div>
                </div>

                <!-- Footer Gold Bar -->
                <div class="relative px-4 py-1 bg-gradient-to-r from-[#1e3a8a] via-blue-900 to-[#1e3a8a] text-white flex items-center justify-between text-[8px] z-10 border-t-2 border-amber-400">
                  <span class="font-bold text-amber-300 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles class="w-3 h-3 text-amber-300" />
                    SKILL VILLAGE OFFICIAL CARD
                  </span>
                  <span class="font-semibold text-slate-200">IDENTITAS RESMI SANTRI</span>
                </div>
              </div>
            </div>

            <!-- SISI BAWAH: TAMPAK BELAKANG (NAMA SANTRI LENGKAP) -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                <span>2. Tampak Belakang (QR Code Scanner & Peraturan)</span>
                <span class="text-amber-600 font-bold flex items-center gap-1">
                  <QrCode class="w-3 h-3 text-amber-500" />
                  BACK SIDE (CR80)
                </span>
              </div>

              <div class="w-full aspect-[85.6/53.98] max-w-[440px] mx-auto bg-[#fdfbf7] text-slate-900 rounded-xl shadow-2xl relative overflow-hidden border-2 border-amber-300 flex flex-col justify-between items-center text-center select-none transition-transform hover:scale-[1.01]">
                <div v-if="showSafeArea" class="absolute inset-[8px] border border-dashed border-red-500/50 pointer-events-none z-30 flex items-start justify-end p-1">
                  <span class="text-[7px] text-red-500 font-mono bg-white/80 px-1 rounded">Safe Area (-3mm)</span>
                </div>

                <div v-if="showCropMarks" class="absolute inset-0 pointer-events-none z-40">
                  <div class="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-slate-900"></div>
                  <div class="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-slate-900"></div>
                  <div class="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-slate-900"></div>
                  <div class="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-slate-900"></div>
                </div>

                <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                  <img src="/logo-skill-village.webp" class="w-40 h-40 object-contain opacity-[0.10] scale-95" />
                </div>

                <div class="w-full h-9 bg-gradient-to-r from-[#1e3a8a] via-blue-900 to-[#1e3a8a] border-b-2 border-amber-400 flex items-center justify-between px-4 z-10 shadow-sm">
                  <div class="flex items-center space-x-2">
                    <img src="/logo-skill-village.webp" class="w-5 h-5 object-contain" />
                    <span class="font-black text-xs text-white uppercase tracking-wide">SKILL VILLAGE</span>
                  </div>
                  <span class="text-[8px] font-mono text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded border border-amber-400/40 font-bold">OFFICIAL SCANNER</span>
                </div>

                <div class="my-auto flex flex-col items-center space-y-1 z-10 py-1">
                  <div class="p-1 rounded-2xl bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-500 shadow-xl">
                    <div class="w-[140px] h-[140px] aspect-square rounded-[14px] bg-white p-2 border-2 border-[#1e3a8a] flex items-center justify-center">
                      <img :src="`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=SANTRI-1002-PREVIEW`" class="w-full h-full object-contain aspect-square" />
                    </div>
                  </div>
                  <!-- NAMA SANTRI BELAKANG -->
                  <p class="text-[11px] font-black text-[#1e3a8a] uppercase tracking-wide pt-0.5">ABDULLAH AZZAM</p>
                  <p class="text-[8.5px] font-mono font-bold text-slate-700">NIS: 1002 — PRESENSI SCANNER</p>
                </div>

                <div class="w-full bg-[#1e3a8a] py-1.5 px-4 text-[7.5px] text-slate-200 border-t border-amber-400/60 z-10 leading-tight">
                  <p>{{ settings.card_note || 'Kartu ini adalah identitas resmi santri Skill Village. Jika menemukan harap mengembalikan.' }}</p>
                  <p class="font-semibold text-amber-300 mt-0.5">{{ settings.foundation_address }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: CETAK KARTU & QR MASSAL -->
    <div v-if="activeTab === 'cetak'" class="space-y-6">
      <div class="neu-card p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-slate-200/60 dark:border-slate-800">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <QrCode class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Pusat Aksi Massal Kartu & QR Code</h3>
            <p class="text-xs text-slate-500">Proses generasi QR Code, unduh berkas ZIP, atau buka pratinjau lembar cetak PDF A4 (10 Kartu per Lembar).</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            @click="handleBulkGenerateQR"
            :disabled="processingBulk"
            class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition"
          >
            <Zap class="w-4 h-4" />
            <span>Generate QR Massal</span>
          </button>

          <button
            type="button"
            @click="handleDownloadBulkZip"
            class="px-4 py-2.5 rounded-xl neu-btn text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center space-x-1.5 active:scale-95 transition"
          >
            <Download class="w-4 h-4 text-blue-500" />
            <span>Unduh Massal QR (.zip)</span>
          </button>

          <button
            type="button"
            @click="openPrintPreviewModal"
            class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-blue-600/20 active:scale-95 transition"
          >
            <Printer class="w-4 h-4" />
            <span>Cetak Kartu Massal (PDF Preview A4 2x5)</span>
          </button>
        </div>
      </div>

      <!-- Table Santri -->
      <div class="neu-card rounded-2xl p-5 space-y-4 border border-slate-200/60 dark:border-slate-800">
        <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari nama santri atau NIS..."
            class="w-full sm:w-72 px-3.5 py-2 rounded-xl text-xs neu-input bg-transparent"
          />
          <span class="text-xs font-semibold text-slate-500">Menampilkan {{ filteredSantris.length }} Santri</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-slate-200/60 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                <th class="py-3 px-4">NO</th>
                <th class="py-3 px-4">SANTRI</th>
                <th class="py-3 px-4">NIS</th>
                <th class="py-3 px-4">KELAS</th>
                <th class="py-3 px-4 text-center">STATUS CR80</th>
                <th class="py-3 px-4 text-center">AKSI INDIVIDUAL</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              <tr v-for="(s, idx) in filteredSantris" :key="s.id" class="hover:bg-slate-500/5">
                <td class="py-3 px-4 font-bold text-slate-400">{{ idx + 1 }}</td>
                <td class="py-3 px-4 font-bold text-slate-900 dark:text-white">{{ s.name }}</td>
                <td class="py-3 px-4 font-mono text-blue-500">{{ s.nis || '-' }}</td>
                <td class="py-3 px-4 text-slate-600 dark:text-slate-300">{{ s.kelas?.name || '-' }}</td>
                <td class="py-3 px-4 text-center">
                  <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                    READY (CR80 PRINT)
                  </span>
                </td>
                <td class="py-3 px-4 text-center">
                  <div class="flex items-center justify-center space-x-1.5">
                    <button
                      type="button"
                      @click="handleSingleGenerateQR(s)"
                      class="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-500 active:scale-95 transition"
                    >
                      Generate QR
                    </button>
                    <button
                      type="button"
                      @click="openSingleQRModal(s)"
                      class="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-500 active:scale-95 transition"
                    >
                      Preview QR
                    </button>
                    <button
                      type="button"
                      @click="openSingleCardModal(s)"
                      class="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-500 active:scale-95 transition"
                    >
                      Preview Kartu
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- MODAL 1: PREVIEW QR CODE INDIVIDUAL -->
    <Teleport to="body">
      <div v-if="selectedSantriQR" class="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div class="w-full max-w-md neu-card p-6 rounded-3xl space-y-4 border border-slate-200/60 dark:border-slate-800 text-center relative">
          <button @click="selectedSantriQR = null" class="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
            <X class="w-5 h-5" />
          </button>

          <h3 class="text-sm font-bold text-slate-900 dark:text-white">QR Code Scanner Santri</h3>
          <p class="text-xs font-bold text-blue-500">{{ selectedSantriQR.name }} (NIS: {{ selectedSantriQR.nis }})</p>

          <div class="w-72 h-72 aspect-square mx-auto p-3 neu-inset rounded-2xl flex items-center justify-center bg-white border border-slate-200">
            <img :src="`https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=SANTRI-${selectedSantriQR.nis}`" class="w-full h-full object-contain aspect-square" />
          </div>

          <div class="flex items-center space-x-2 pt-2">
            <button
              type="button"
              @click="downloadSingleQRPng(selectedSantriQR)"
              class="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 active:scale-95 transition"
            >
              Unduh QR (.png)
            </button>
            <button
              type="button"
              @click="openSingleCardModal(selectedSantriQR)"
              class="flex-1 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 active:scale-95 transition"
            >
              Cetak Kartu
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL 2: PREVIEW CETAK LEMBAR A4 LIGHT MODE KREM (NAMA SANTRI DI BELAKANG) -->
    <Teleport to="body">
      <div v-if="showPrintPreviewModal" class="fixed inset-0 z-[230] flex flex-col bg-[#f6f4ee] text-slate-900">
        <!-- Top Action Bar Light Mode -->
        <div class="p-4 bg-white border-b border-amber-200/80 shadow-xs flex items-center justify-between shrink-0 print:hidden">
          <div class="flex items-center space-x-3">
            <Printer class="w-5 h-5 text-blue-600" />
            <div>
              <h3 class="text-sm font-bold text-slate-900">Lembar Cetak PDF A4 Presisi — Grid 2×5 (Nama Santri Sisi Belakang)</h3>
              <p class="text-xs text-slate-500">Setiap Halaman A4 memuat 5 pasang kartu lengkap dengan Nama Santri di sisi depan dan belakang (anti salah pasang/tukar).</p>
            </div>
          </div>

          <div class="flex items-center space-x-3">
            <label class="flex items-center space-x-1.5 text-xs text-slate-700 font-semibold cursor-pointer">
              <input type="checkbox" v-model="showCropMarks" class="rounded border-slate-300 text-blue-600" />
              <span>Garis Potong (Crop Marks)</span>
            </label>

            <button
              type="button"
              @click="triggerBrowserPrint"
              class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center space-x-1.5 shadow-md shadow-blue-600/20 active:scale-95 transition"
            >
              <Printer class="w-4 h-4" />
              <span>Cetak / Simpan PDF (10 Kartu/Lembar A4)</span>
            </button>
            <button @click="showPrintPreviewModal = false" class="p-2 text-slate-400 hover:text-slate-700">
              <X class="w-6 h-6" />
            </button>
          </div>
        </div>

        <!-- Printable A4 Pages Container -->
        <div class="flex-1 overflow-y-auto p-6 bg-[#f6f4ee] flex flex-col items-center space-y-8 print:p-0 print:bg-white print:overflow-visible">
          <!-- Chunking 5 santri per halaman A4 (10 Kartu) -->
          <div
            v-for="(pageChunk, pageIdx) in chunkedSantris"
            :key="pageIdx"
            class="w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] bg-white text-slate-900 p-[10mm] shadow-xl relative flex flex-col justify-between shrink-0 print:shadow-none print:m-0 print:w-[210mm] print:h-[297mm] break-after-page"
          >
            <!-- Header Watermark Infomasi Lembar -->
            <div class="flex justify-between items-center text-[9px] font-bold text-slate-400 border-b border-slate-200 pb-1 mb-2">
              <span class="flex items-center gap-1 text-[#1e3a8a]">
                <Sparkles class="w-3 h-3 text-amber-500" />
                SKILL VILLAGE OFFICIAL SANTRI CARD — LEMBAR A4 (5 PASANG / 10 KARTU)
              </span>
              <span class="font-mono text-slate-500">HALAMAN {{ pageIdx + 1 }} dari {{ chunkedSantris.length }}</span>
            </div>

            <!-- GRID 2 KOLOM X 5 BARIS KARTU -->
            <div class="grid grid-cols-2 gap-y-[4mm] gap-x-[6mm] justify-items-center items-start content-start flex-1">
              <template v-for="s in pageChunk" :key="s.id">
                <!-- SISI DEPAN CETAK (85.6mm × 53.98mm — UI 100% IDENTIK) -->
                <div class="w-[85.6mm] h-[53.98mm] bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900 rounded-xl shadow-sm border border-slate-300 relative overflow-hidden flex flex-col justify-between shrink-0 select-none">
                  <div v-if="showCropMarks" class="absolute inset-0 pointer-events-none z-40">
                    <div class="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-slate-900"></div>
                    <div class="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-slate-900"></div>
                    <div class="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-slate-900"></div>
                    <div class="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-slate-900"></div>
                  </div>

                  <!-- WATERMARK LOGO SKILL VILLAGE -->
                  <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                    <img src="/logo-skill-village.webp" class="w-36 h-36 object-contain opacity-[0.10] scale-95 filter drop-shadow-md" />
                  </div>

                  <!-- Gold & Navy Header Accent Ribbon -->
                  <div class="absolute top-0 left-0 right-0 h-9 bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#1e3a8a] flex items-center justify-between px-3 z-10 border-b-2 border-amber-400/80 shadow-md">
                    <div class="flex items-center space-x-2">
                      <div class="w-6 h-6 rounded-lg bg-white/95 p-0.5 flex items-center justify-center shadow border border-amber-300/60 backdrop-blur-sm">
                        <img src="/logo-skill-village.webp" class="w-full h-full object-contain" />
                      </div>
                      <div>
                        <span class="font-black text-[9px] text-white uppercase tracking-wider block leading-none">SKILL VILLAGE</span>
                        <span class="text-[6.5px] font-bold text-amber-300 tracking-widest uppercase block mt-0.5">ISLAMIC BOARDING SCHOOL</span>
                      </div>
                    </div>
                    <div class="h-full flex items-center">
                      <div class="px-2 py-0.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-[#1e3a8a] font-black text-[7.5px] uppercase tracking-widest rounded-l-full shadow-inner border-l border-white/60">
                        OFFICIAL CARD
                      </div>
                    </div>
                  </div>

                  <!-- Geometric Golden Corner Ribbons -->
                  <div class="absolute bottom-5 right-0 w-20 h-16 bg-gradient-to-tl from-amber-400/20 via-yellow-300/10 to-transparent pointer-events-none rounded-tl-full"></div>
                  <div class="absolute bottom-0 left-0 w-20 h-4 bg-[#1e3a8a] transform -skew-x-[30deg] -translate-x-4 pointer-events-none"></div>

                  <!-- Content Body -->
                  <div class="pt-10 px-3 pb-1 flex-1 flex items-start z-10 relative">
                    <div class="grid grid-cols-12 gap-2 items-start w-full pt-0.5">
                      <!-- Foto -->
                      <div class="col-span-4 flex flex-col items-center justify-start -mt-0.5">
                        <div class="relative p-0.5 rounded-xl bg-gradient-to-b from-amber-400 via-yellow-300 to-amber-500 shadow-md">
                          <div class="w-[18mm] h-[18mm] rounded-lg border-2 border-[#1e3a8a] overflow-hidden bg-white flex items-center justify-center">
                            <img v-if="s.avatar_url" :src="getPublicImageUrl(s.avatar_url)" class="w-full h-full object-cover aspect-square" />
                            <User v-else class="w-7 h-7 text-[#1e3a8a]" />
                          </div>
                        </div>
                      </div>

                      <!-- Teks Identitas -->
                      <div class="col-span-8 space-y-0.5 text-[8px] font-semibold">
                        <div class="flex items-center space-x-1 mb-0.5">
                          <h4 class="font-black text-[#1e3a8a] text-[9.5px] uppercase leading-none">KARTU SANTRI</h4>
                          <span class="px-1 py-0.2 rounded bg-amber-400/20 border border-amber-400/40 text-[6.5px] font-black text-amber-700">AKTIF</span>
                        </div>

                        <div class="flex items-center">
                          <span class="w-10 font-black text-slate-950 shrink-0">Nama</span>
                          <span class="w-2 font-black text-slate-950 shrink-0">:</span>
                          <span class="font-black text-[#1e3a8a] uppercase truncate text-[8.5px]">{{ s.name }}</span>
                        </div>
                        <div class="flex items-center">
                          <span class="w-10 font-black text-slate-950 shrink-0">NIS</span>
                          <span class="w-2 font-black text-slate-950 shrink-0">:</span>
                          <span class="font-black text-slate-950 font-mono text-[7.5px]">{{ s.nis || (s.nik ? s.nik : '-') }}</span>
                        </div>
                        <div class="flex items-center">
                          <span class="w-10 font-black text-slate-950 shrink-0">Jurusan</span>
                          <span class="w-2 font-black text-slate-950 shrink-0">:</span>
                          <span class="font-bold text-amber-700 truncate text-[7.5px]">{{ s.jurusan?.name || 'Tahfidz Al-Qur\'an' }}</span>
                        </div>
                        <div class="flex items-center">
                          <span class="w-10 font-black text-slate-950 shrink-0">TTL</span>
                          <span class="w-2 font-black text-slate-950 shrink-0">:</span>
                          <span class="font-bold text-slate-900 truncate text-[7.5px]">{{ (s.tempat_lahir || 'Kediri') + ', ' + (formatDate(s.birth_date || s.tanggal_lahir) || '19 Feb 2008') }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Motto Cetak -->
                    <div class="absolute bottom-9 left-2.5 z-20 pointer-events-none">
                      <div
                        class="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400/25 via-yellow-300/40 to-amber-400/25 border border-amber-400/60 shadow-xs backdrop-blur-xs flex items-center justify-center transition-transform"
                        :style="{
                          transform: `translate(${settings.card_motto_offset_x || 26}px, ${settings.card_motto_offset_y || 4}px) scale(${(settings.card_motto_scale || 105) / 100})`
                        }"
                      >
                        <p class="text-[7.5px] italic font-black text-[#1e3a8a] leading-tight tracking-tight whitespace-nowrap">
                          "{{ settings.card_motto || 'Berilmu, Beramal & Berakhlaqul Karimah' }}"
                        </p>
                      </div>
                    </div>

                    <!-- TTD & Cap Cetak -->
                    <div class="absolute bottom-1 right-2.5 flex flex-col items-end text-right z-20">
                      <div class="h-5 relative flex items-center justify-end w-full overflow-visible">
                        <img
                          v-if="settings.card_stempel_url"
                          :src="getPublicImageUrl(settings.card_stempel_url)"
                          class="absolute right-3 top-0 h-5 opacity-85 pointer-events-none object-contain"
                          :style="{
                            transform: `translate(${settings.card_stempel_offset_x || 0}px, ${settings.card_stempel_offset_y || 0}px) scale(${(settings.card_stempel_scale || 100) / 100})`
                          }"
                        />
                        <img
                          v-if="settings.card_ttd_url"
                          :src="getPublicImageUrl(settings.card_ttd_url)"
                          class="h-5 relative z-10 object-contain"
                          :style="{
                            transform: `translate(${settings.card_ttd_offset_x || 0}px, ${settings.card_ttd_offset_y || 0}px) scale(${(settings.card_ttd_scale || 100) / 100})`
                          }"
                        />
                      </div>
                      <p class="text-[6.5px] font-black text-[#1e3a8a] underline leading-none">{{ settings.card_signer_name || 'KH. Ahmad Dahlan, M.Pd.' }}</p>
                      <p class="text-[5.5px] text-slate-500 font-bold mt-0.5">{{ settings.card_signer_title || 'Kepala Pengurus Pesantren' }}</p>
                    </div>
                  </div>

                  <!-- Footer Gold Bar -->
                  <div class="relative px-3 py-0.5 bg-gradient-to-r from-[#1e3a8a] via-blue-900 to-[#1e3a8a] text-white flex items-center justify-between text-[6.5px] z-10 border-t border-amber-400">
                    <span class="font-bold text-amber-300 uppercase tracking-wider flex items-center gap-0.5">
                      <Sparkles class="w-2.5 h-2.5 text-amber-300" />
                      SKILL VILLAGE OFFICIAL CARD
                    </span>
                    <span class="font-semibold text-slate-200">IDENTITAS RESMI SANTRI</span>
                  </div>
                </div>

                <!-- SISI BELAKANG CETAK (NAMA SANTRI DI BELAKANG — ANTI SALAH PASANG) -->
                <div class="w-[85.6mm] h-[53.98mm] bg-[#fdfbf7] text-slate-900 rounded-xl shadow-sm border-2 border-amber-300 relative overflow-hidden flex flex-col justify-between items-center text-center shrink-0 select-none">
                  <div v-if="showCropMarks" class="absolute inset-0 pointer-events-none z-40">
                    <div class="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-slate-900"></div>
                    <div class="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-slate-900"></div>
                    <div class="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-slate-900"></div>
                    <div class="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-slate-900"></div>
                  </div>

                  <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                    <img src="/logo-skill-village.webp" class="w-36 h-36 object-contain opacity-[0.10] scale-95" />
                  </div>

                  <!-- Header Ribbon Belakang -->
                  <div class="w-full h-7 bg-gradient-to-r from-[#1e3a8a] via-blue-900 to-[#1e3a8a] border-b-2 border-amber-400 flex items-center justify-between px-3 z-10 shadow-xs">
                    <div class="flex items-center space-x-1.5">
                      <img src="/logo-skill-village.webp" class="w-4 h-4 object-contain" />
                      <span class="font-black text-[9px] text-white uppercase tracking-wide">SKILL VILLAGE</span>
                    </div>
                    <span class="text-[7px] font-mono text-amber-300 bg-amber-400/20 px-1.5 py-0.5 rounded border border-amber-400/40 font-bold">OFFICIAL SCANNER</span>
                  </div>

                  <!-- QR Container Belakang + Nama Santri -->
                  <div class="my-auto flex flex-col items-center space-y-0.5 z-10 py-0.5">
                    <div class="p-0.5 rounded-xl bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-500 shadow-md">
                      <div class="w-[26mm] h-[26mm] aspect-square rounded-lg bg-white p-1 border-2 border-[#1e3a8a] flex items-center justify-center">
                        <img :src="`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=SANTRI-${s.nis || s.id}`" class="w-full h-full object-contain aspect-square" />
                      </div>
                    </div>
                    <!-- NAMA SANTRI CETAK SISI BELAKANG -->
                    <p class="text-[8.5px] font-black text-[#1e3a8a] uppercase tracking-wide truncate max-w-[75mm] pt-0.5">{{ s.name }}</p>
                    <p class="text-[7px] font-mono font-bold text-slate-700">NIS: {{ s.nis || '-' }} — PRESENSI SCANNER</p>
                  </div>

                  <!-- Footer Belakang -->
                  <div class="w-full bg-[#1e3a8a] py-1 px-3 text-[6.5px] text-slate-200 border-t border-amber-400/60 z-10 leading-tight">
                    <p class="truncate">{{ settings.card_note || 'Kartu ini adalah identitas resmi santri Skill Village. Jika menemukan harap mengembalikan.' }}</p>
                    <p class="font-semibold text-amber-300 mt-0.5">{{ settings.foundation_address }}</p>
                  </div>
                </div>
              </template>
            </div>

            <!-- Footer Halaman A4 -->
            <div class="text-center text-[8px] text-slate-400 border-t border-slate-200 pt-1 mt-1 shrink-0">
              Dicetak via Dashboard Resmi Skill Village — Format Standar PVC ID Card CR80 (85.6mm × 53.98mm)
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import axios from 'axios'
import {
  ArrowLeft, LayoutTemplate, Printer, Sliders, Save, Eye, User, QrCode, Zap, Download, X, Upload, Sparkles, ShieldCheck, Move, RotateCcw, Scissors
} from 'lucide-vue-next'
import { useNotificationStore } from '@/stores/notification'

const notify = useNotificationStore()
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api-skillage.dimzzy.my.id/api/v1'

const activeTab = ref('template')
const savingSettings = ref(false)
const processingBulk = ref(false)
const uploadingKey = ref(null)
const searchQuery = ref('')
const santris = ref([])
const selectedSantriQR = ref(null)
const showPrintPreviewModal = ref(false)
const showCropMarks = ref(true)
const showSafeArea = ref(false)

const settings = reactive({
  foundation_name: 'Skill Village',
  foundation_tagline: 'Pusat Manajemen Pesantren & Sekolah',
  foundation_address: 'Jl. Pesantren No. 1, Kediri, Jawa Timur',
  card_ttd_url: '',
  card_stempel_url: '',
  card_signer_title: 'Kepala Pengurus Pesantren',
  card_signer_name: 'KH. Ahmad Dahlan, M.Pd.',
  card_motto: 'Berilmu, Beramal & Berakhlaqul Karimah',
  card_note: 'Kartu ini adalah kartu identitas resmi santri Skill Village.',
  card_motto_scale: 105,
  card_motto_offset_x: 26,
  card_motto_offset_y: 4,
  card_ttd_scale: 100,
  card_ttd_offset_x: 0,
  card_ttd_offset_y: 0,
  card_stempel_scale: 100,
  card_stempel_offset_x: 0,
  card_stempel_offset_y: 0
})

const getHeaders = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const getPublicImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('blob:')) return url
  if (url.includes('storage.santrix.my.id')) return url
  if (url.includes('localhost') || url.startsWith('/storage')) {
    const cleanPath = url.replace(/https?:\/\/[^\/]+/, '').replace(/^\/storage/, '')
    return `https://api-skillage.dimzzy.my.id/storage${cleanPath}`
  }
  return url
}

const formatDate = (val) => {
  if (!val) return ''
  try {
    const d = new Date(val)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch (e) {
    return val
  }
}

const resetMottoPosition = () => {
  settings.card_motto_scale = 105
  settings.card_motto_offset_x = 26
  settings.card_motto_offset_y = 4
  notify.info('Posisi & Ukuran Motto telah dikembalikan ke preset 105% (26px, 4px).', 'Reset Motto')
}

const resetTtdPosition = () => {
  settings.card_ttd_scale = 100
  settings.card_ttd_offset_x = 0
  settings.card_ttd_offset_y = 0
  notify.info('Posisi & Ukuran TTD telah dikembalikan ke default.', 'Reset TTD')
}

const resetStempelPosition = () => {
  settings.card_stempel_scale = 100
  settings.card_stempel_offset_x = 0
  settings.card_stempel_offset_y = 0
  notify.info('Posisi & Ukuran Cap Stempel telah dikembalikan ke default.', 'Reset Cap')
}

const fetchSettings = async () => {
  try {
    const res = await axios.get(`${API_BASE}/settings/foundation`, { headers: getHeaders() })
    if (res.data && res.data.data) {
      Object.assign(settings, res.data.data)
      if (!settings.card_motto_scale) settings.card_motto_scale = 105
      if (settings.card_motto_offset_x === undefined) settings.card_motto_offset_x = 26
      if (settings.card_motto_offset_y === undefined) settings.card_motto_offset_y = 4
      if (!settings.card_ttd_scale) settings.card_ttd_scale = 100
      if (!settings.card_stempel_scale) settings.card_stempel_scale = 100
      if (!settings.card_motto) settings.card_motto = 'Berilmu, Beramal & Berakhlaqul Karimah'
    }
  } catch (e) {
    console.error('Failed to fetch settings:', e)
  }
}

const fetchSantris = async () => {
  try {
    const res = await axios.get(`${API_BASE}/master/santri?all=true`, { headers: getHeaders() })
    if (res.data && res.data.data) {
      santris.value = res.data.data
    }
  } catch (e) {
    console.error('Failed to fetch santris:', e)
  }
}

onMounted(() => {
  fetchSettings()
  fetchSantris()
})

const filteredSantris = computed(() => {
  if (!searchQuery.value) return santris.value
  const q = searchQuery.value.toLowerCase()
  return santris.value.filter(s =>
    (s.name && s.name.toLowerCase().includes(q)) ||
    (s.nis && s.nis.toLowerCase().includes(q))
  )
})

// Chunk 5 santri (5 pasang = 10 kartu) per halaman A4
const chunkedSantris = computed(() => {
  const list = filteredSantris.value
  const chunkSize = 5
  const chunks = []
  for (let i = 0; i < list.length; i += chunkSize) {
    chunks.push(list.slice(i, i + chunkSize))
  }
  return chunks.length ? chunks : [[]]
})

const uploadImage = async (event, key) => {
  const file = event.target.files[0]
  if (!file) return
  uploadingKey.value = key
  const formData = new FormData()
  formData.append('image', file)
  formData.append('file', file)
  formData.append('folder', 'card_assets')

  try {
    const res = await axios.post(`${API_BASE}/upload`, formData, {
      headers: {
        ...getHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    })
    const rawUrl = res.data?.data?.url || res.data?.url
    if (rawUrl) {
      settings[key] = getPublicImageUrl(rawUrl)
      notify.success('Gambar berhasil diunggah ke storage.', 'Unggah Berhasil')
    } else {
      notify.error('Respons server tidak memuat URL gambar.', 'Gagal Unggah')
    }
  } catch (e) {
    console.error('Upload error:', e)
    notify.error(e.response?.data?.message || 'Gagal mengunggah gambar.', 'Gagal Unggah')
  } finally {
    uploadingKey.value = null
  }
}

const saveTemplateSettings = async () => {
  savingSettings.value = true
  try {
    await axios.post(`${API_BASE}/settings/foundation`, settings, { headers: getHeaders() })
    notify.success('Pengaturan template kartu santri Skill Village berhasil disimpan!', 'Disimpan')
  } catch (e) {
    notify.error('Gagal menyimpan pengaturan template.', 'Gagal Simpan')
  } finally {
    savingSettings.value = false
  }
}

const handleSingleGenerateQR = async (santri) => {
  try {
    await axios.post(`${API_BASE}/master/santri/${santri.id}/generate-qr`, {}, { headers: getHeaders() })
    notify.success(`QR Code santri ${santri.name} berhasil diperbarui!`, 'QR Ready')
    fetchSantris()
  } catch (e) {
    notify.error('Gagal me-generate QR code.', 'Error QR')
  }
}

const handleBulkGenerateQR = async () => {
  processingBulk.value = true
  try {
    const res = await axios.post(`${API_BASE}/master/santri/generate-qr-bulk`, {}, { headers: getHeaders() })
    notify.success(res.data.message || 'QR Code massal seluruh santri berhasil diperbarui!', 'QR Massal Ready')
    fetchSantris()
  } catch (e) {
    notify.error('Gagal me-generate QR massal.', 'Error QR Massal')
  } finally {
    processingBulk.value = false
  }
}

const handleDownloadBulkZip = () => {
  notify.info('Membuka tautan unduhan berkas ZIP QR Code...', 'Unduh ZIP')
  window.open(`${API_BASE}/santris/export-qr-zip`, '_blank')
}

const openSingleQRModal = (santri) => {
  selectedSantriQR.value = santri
}

const downloadSingleQRPng = (santri) => {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=SANTRI-${santri.nis}`
  const link = document.createElement('a')
  link.href = url
  link.download = `QR_${santri.nis}_${santri.name}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  notify.success(`Berkas QR Code ${santri.name} telah diunduh.`, 'Unduh QR')
}

const openSingleCardModal = (santri) => {
  searchQuery.value = santri.nis || santri.name
  showPrintPreviewModal.value = true
}

const openPrintPreviewModal = () => {
  searchQuery.value = ''
  showPrintPreviewModal.value = true
}

const triggerBrowserPrint = () => {
  window.print()
}
</script>

<style scoped>
@page {
  size: A4 portrait;
  margin: 0;
}
@media print {
  body {
    background-color: white !important;
  }
  .break-after-page {
    page-break-after: always !important;
    break-after: page !important;
  }
}
</style>
