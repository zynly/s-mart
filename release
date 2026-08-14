#!/usr/bin/env bash

# ==============================================================================
# SKILLAGE MART - DUAL-OS DESKTOP RELEASE MANAGER (100% LOKAL)
# ==============================================================================

# Colors & Formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

TARGET_DIR="/home/pak-hakim/Hakim/Worker/Dokumen Arsip/Skill Village/POS Dekstop"

function print_banner() {
    clear
    echo -e "${CYAN}========================================================================${NC}"
    echo -e "${BOLD}${MAGENTA}   🏪 SKILLAGE MART — DUAL-OS (LINUX & WINDOWS) BUILDER (TUI) ${NC}"
    echo -e "${CYAN}========================================================================${NC}"
    echo -e " Mode Target        : ${GREEN}100% LOKAL (Linux .AppImage/.deb & Windows .exe/.msi)${NC}"
    echo -e " Folder Penyimpanan : ${YELLOW}${TARGET_DIR}${NC}"
    echo -e " Domain Server      : ${GREEN}https://pos.skillage-mart.com${NC}"
    echo -e "${CYAN}========================================================================${NC}"
    echo ""
}

function build_local() {
    node scripts/build-and-install-local.js
    echo ""
    read -p "Tekan [Enter] untuk kembali ke menu..."
}

function list_installers() {
    print_banner
    echo -e "${BOLD}${CYAN}📂 DAFTAR BERKAS INSTALLER DI FOLDER TARGET${NC}\n"
    echo -e "Lokasi: ${YELLOW}${TARGET_DIR}${NC}\n"
    
    if [ -d "$TARGET_DIR" ] && [ "$(ls -A "$TARGET_DIR" 2>/dev/null)" ]; then
        ls -lh "$TARGET_DIR" | awk 'NR>1 {print "  📦 " $9 " (" $5 ")"}'
    else
        echo -e "${YELLOW}⚠️ Folder target masih kosong.${NC}"
        echo -e "Jalankan opsi [1] untuk melakukan build lokal."
    fi
    echo ""
    read -p "Tekan [Enter] me-refresh..."
}

function clean_local() {
    print_banner
    echo -e "${BOLD}${RED}🧹 BERSIHKAN INSTALLER LAMA DI FOLDER TARGET${NC}\n"
    read -p "Apakah Anda yakin ingin menghapus installer lama di folder target? [y/N]: " CONFIRM
    if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
        rm -f "$TARGET_DIR"/*.exe "$TARGET_DIR"/*.msi "$TARGET_DIR"/*.AppImage "$TARGET_DIR"/*.deb
        echo -e "\n${GREEN}✅ Berkas installer lama berhasil dibersihkan!${NC}"
    fi
    echo ""
    read -p "Tekan [Enter] untuk kembali ke menu..."
}

while true; do
    print_banner
    echo -e " ${BOLD}MENU OPSI UTAMA DUAL-OS:${NC}"
    echo -e "  ${GREEN}[1]${NC} 🔨 Build Dual-OS (Linux .AppImage + Windows .exe) & Pasang"
    echo -e "  ${GREEN}[2]${NC} 📂 Lihat Berkas Installer di Folder Target"
    echo -e "  ${GREEN}[3]${NC} 🧹 Bersihkan Installer Lama di Folder Target"
    echo -e "  ${RED}[0]${NC} 🚪 Keluar"
    echo -e "${CYAN}========================================================================${NC}"
    read -p "Pilih opsi [0-3]: " CHOICE

    case $CHOICE in
        1) build_local ;;
        2) list_installers ;;
        3) clean_local ;;
        0) echo -e "\n${GREEN}Terima kasih! Sampai jumpa.${NC}\n"; exit 0 ;;
        *) echo -e "${RED}Pilihan tidak valid!${NC}"; sleep 1 ;;
    esac
done
