
/* =========================================
   THE LAST RONIN
   Main JavaScript
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    // 1. ELEMENT UTAMA
    const scenes = [...document.querySelectorAll(".scene")];
    const slashTransition = document.getElementById("slashTransition");
    const openInvitationButton = document.getElementById("openInvitation");

    const musicButton = document.getElementById("musicButton");
    const musicIcon = document.getElementById("musicIcon");
    const backgroundMusic = document.getElementById("backgroundMusic");

    const backgroundVideo = document.getElementById("coverVideo");
    const backgroundVideoSource = document.getElementById("coverVideoSource");

    // 2. KONFIGURASI
    const config =
        typeof CONFIG !== "undefined" ? CONFIG :
        typeof window.CONFIG !== "undefined" ? window.CONFIG :
        null;

    if (!config) {
        console.error("CONFIG tidak ditemukan. Periksa config.js.");
        return;
    }

    const musicConfig = config.music || {};
    const soundConfig = config.sounds || {};

    // Pengaturan teknis audio dikelola di sini.
    const musicVolume = 0.42;
    const slashVolume = 0.42;
    const slashMaximumVolume = 0.48;

    const slashSoundEnabled = true;

    const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    const slashDuration = prefersReducedMotion ? 0 : 580;
    const sceneDuration = prefersReducedMotion ? 0 : 1400;

    document.documentElement.style.setProperty(
        "--transition-scene",
        `${sceneDuration}ms`
    );

    document.documentElement.style.setProperty(
        "--transition-slash",
        `${slashDuration}ms`
    );

    let isTransitioning = false;
    let wheelLocked = false;
    let wheelUnlockTimer = null;

    let slashAudioErrorReported = false;
    let slashAudioInitialized = false;
    let slashAudioTracks = [];

    let musicPlayPending = false;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartScrollTop = 0;
    let touchStartedOnControl = false;

    // 3. FUNGSI BANTUAN
    function wait(duration) {
        return new Promise((resolve) => {
            window.setTimeout(resolve, duration);
        });
    }

    function isAudioElement(element) {
        return element instanceof HTMLAudioElement;
    }

    // 4. AUDIO EFEK TEBASAN
    // Path audio berasal dari CONFIG.sounds.
    // Volume dan perilaku audio tetap dikelola JavaScript.
    function initializeSlashAudio() {
        if (slashAudioInitialized) return;

        slashAudioInitialized = true;

        if (!slashSoundEnabled) return;

        const metalSlash = document.getElementById("slashWhooshMetal");
        const bladeWhoosh = document.getElementById("slashWhooshBlade");

        if (!isAudioElement(metalSlash) || !isAudioElement(bladeWhoosh)) {
            console.error(
                "Elemen audio SFX tidak ditemukan. Periksa index.html."
            );
            return;
        }

        const soundEntries = [
            {
                audio: metalSlash,
                source: soundConfig.slashMetal
            },
            {
                audio: bladeWhoosh,
                source: soundConfig.slashBlade
            }
        ];

        slashAudioTracks = [];

        soundEntries.forEach(({ audio, source }) => {
            const path = String(source || "").trim();

            if (!path) {
                audio.removeAttribute("src");
                audio.load();
                return;
            }

            audio.pause();
            audio.src = path;
            audio.preload = "auto";
            audio.volume = slashVolume;
            audio.load();

            slashAudioTracks.push(audio);
        });
    }

    function stopSlashAudio() {
        slashAudioTracks.forEach((audio) => {
            audio.pause();

            try {
                audio.currentTime = 0;
            } catch (_) {
                // Audio belum siap diputar.
            }
        });
    }

    function playAudioTrack(audio) {
        if (!isAudioElement(audio) || !audio.src) return;

        audio.volume = Math.max(
            0,
            Math.min(slashVolume, slashMaximumVolume, 1)
        );

        try {
            audio.currentTime = 0;
        } catch (_) {
            // Browser mungkin belum selesai memuat audio.
        }

        const playback = audio.play();

        if (playback && typeof playback.catch === "function") {
            playback.catch((error) => {
                if (!slashAudioErrorReported) {
                    console.warn(
                        "Efek suara transisi gagal diputar. Periksa path file audio.",
                        error
                    );

                    slashAudioErrorReported = true;
                }
            });
        }
    }

    function playSlashSound(variantIndex) {
        if (!slashSoundEnabled) return;

        initializeSlashAudio();

        if (slashAudioTracks.length === 0) return;

        stopSlashAudio();

        const safeIndex =
            Math.abs(Number(variantIndex) || 0) %
            slashAudioTracks.length;

        playAudioTrack(slashAudioTracks[safeIndex]);
    }

    // 5. FUNGSI TEKS
    function setText(id, value) {
        const element = document.getElementById(id);
        const text = value == null ? "" : String(value).trim();

        if (!element) return false;

        element.textContent = text;
        element.hidden = text.length === 0;

        return text.length > 0;
    }

    function setHeading(id, leadId, accentId, heading = {}) {
        const hasLead = setText(leadId, heading.lead);
        const hasAccent = setText(accentId, heading.accent);
        const element = document.getElementById(id);

        if (element) {
            element.hidden = !hasLead && !hasAccent;
        }
    }

    function isInteractiveElement(element) {
        if (!(element instanceof Element)) return false;

        return Boolean(
            element.closest(
                "button, a, input, textarea, select, label, " +
                "[contenteditable='true']"
            )
        );
    }

    function getActiveScene() {
        return scenes.find((scene) =>
            scene.classList.contains("active")
        );
    }

    function canScrollScene(scene, direction) {
        if (!scene) return false;

        const hasOverflow =
            scene.scrollHeight > scene.clientHeight + 2;

        if (!hasOverflow) return false;

        if (direction > 0) {
            return (
                scene.scrollTop + scene.clientHeight <
                scene.scrollHeight - 2
            );
        }

        if (direction < 0) {
            return scene.scrollTop > 2;
        }

        return false;
    }

    // 6. TEKS UNDANGAN
    function populateContent() {
        const content = config.content || {};
        const cover = content.cover || {};
        const awakening = content.awakening || {};
        const journey = content.journey || {};
        const oath = content.oath || {};
        const closing = content.closing || {};
        const navigation = content.navigation || {};
        const letter = content.letter || {};

        const title = String(config.templateName || "").trim();
        const description = String(config.metaDescription || "").trim();

        document.title = title
            ? `${title} | GreetingGo`
            : "GreetingGo";

        const metaDescription = document.getElementById("pageDescription");

        if (metaDescription) {
            if (description) {
                metaDescription.content = description;
            } else {
                metaDescription.removeAttribute("content");
            }
        }

        setText("recipientName", config.recipientName);

        setText("coverChapter", cover.chapter);
        setText("coverEmblem", cover.emblem);
        setText(
            "coverSubtitle",
            cover.subtitle || config.templateSubtitle
        );

        setHeading("mainTitle", "coverTitleLead", "coverTitleAccent", {
            lead: cover.titleLead,
            accent: cover.titleAccent
        });

        setText("coverDescription", cover.description);
        setText("openButtonLabel", cover.buttonLabel);
        setText("openButtonSymbol", cover.buttonSymbol);
        setText("coverFooter", cover.footer);

        setText("awakeningChapter", awakening.chapter);
        setText(
            "awakeningJapaneseHeading",
            awakening.japaneseHeading
        );

        setHeading(
            "awakeningTitle",
            "awakeningTitleLead",
            "awakeningTitleAccent",
            {
                lead: awakening.titleLead,
                accent: awakening.titleAccent
            }
        );

        setText("awakeningDescription", awakening.description);
        setText("photoCaption", awakening.photoCaption);
        setText("openingMessage", awakening.openingMessage);

        setText("journeyChapter", journey.chapter);
        setText("journeyJapaneseHeading", journey.japaneseHeading);

        setHeading(
            "journeyTitle",
            "journeyTitleLead",
            "journeyTitleAccent",
            {
                lead: journey.titleLead,
                accent: journey.titleAccent
            }
        );

        setText("journeyDescription", journey.description);
        setText("journeyDividerSymbol", journey.divider);

        setText("oathChapter", oath.chapter);
        setText("oathJapaneseHeading", oath.japaneseHeading);

        setHeading("oathTitle", "oathTitleLead", "oathTitleAccent", {
            lead: oath.titleLead,
            accent: oath.titleAccent
        });

        setText("oathDescription", oath.description);
        setText("letterOrnament", oath.ornament);
        setText("letterLabel", oath.letterLabel);
        setText("letterTitle", letter.title);
        setText("letterMessage", letter.message);
        setText("letterSignatureLabel", oath.signatureLabel);
        setText("senderName", config.senderName);
        setText("letterStamp", oath.stamp);

        setText("closingChapter", closing.chapter);
        setText(
            "closingJapaneseHeading",
            closing.japaneseHeading
        );

        setHeading(
            "closingTitle",
            "closingTitleLead",
            "closingTitleAccent",
            {
                lead: closing.titleLead,
                accent: closing.titleAccent
            }
        );

        setText("closingEmblem", closing.emblem);
        setText("closingMessage", content.closingMessage);
        setText("closingSignature", closing.signature);
        setText("closingSubtitle", closing.subtitle);

        setText("orderLabel", closing.orderLabel);
        setText("orderTitle", closing.orderTitle);
        setText("orderDescription", closing.orderDescription);
        setText("whatsappLabel", closing.whatsappLabel);
        setText("whatsappSymbol", closing.whatsappSymbol);

        setText("footerTitle", closing.footerTitle);
        setText("footerTagline", closing.footerTagline);

        setText(
            "continueJourneyLabel",
            navigation.continueJourney
        );

        setText("unfoldOathLabel", navigation.unfoldOath);
        setText("finalDawnLabel", navigation.finalDawn);

        document.querySelectorAll(".next-symbol").forEach((symbol) => {
            const text = String(navigation.nextSymbol || "").trim();

            symbol.textContent = text;
            symbol.hidden = text.length === 0;
        });

        const photoCaption = document.querySelector(".photo-caption");

        if (photoCaption) {
            photoCaption.hidden =
                !String(config.recipientName || "").trim() &&
                !String(awakening.photoCaption || "").trim();
        }

        const letterScroll = document.getElementById("letterScroll");

        if (letterScroll) {
            letterScroll.hidden = ![
                oath.ornament,
                oath.letterLabel,
                letter.title,
                letter.message,
                oath.signatureLabel,
                config.senderName,
                oath.stamp
            ].some((value) => String(value || "").trim());
        }

        const orderSection = document.querySelector(".order-section");

        if (orderSection) {
            orderSection.hidden = ![
                closing.orderLabel,
                closing.orderTitle,
                closing.orderDescription,
                closing.whatsappLabel
            ].some((value) => String(value || "").trim());
        }

        const footer = document.querySelector(".site-footer");

        if (footer) {
            footer.hidden =
                !String(closing.footerTitle || "").trim() &&
                !String(closing.footerTagline || "").trim();
        }

        const coverEmblem = document.getElementById("coverEmblem");

        if (coverEmblem?.parentElement) {
            coverEmblem.parentElement.hidden =
                !String(cover.emblem || "").trim();
        }

        const closingEmblem = document.getElementById("closingEmblem");

        if (closingEmblem?.parentElement) {
            closingEmblem.parentElement.hidden =
                !String(closing.emblem || "").trim();
        }
    }

    // 7. GAMBAR
    function setImage(element, source, altText, fallbackContainer) {
        if (!element) return false;

        const container = fallbackContainer || element;
        const imagePath = String(source || "").trim();

        if (!imagePath) {
            container.hidden = true;
            element.removeAttribute("src");
            return false;
        }

        element.alt = altText || "";

        element.onerror = () => {
            console.warn(`Gambar gagal dimuat: ${imagePath}`);
            container.hidden = true;
        };

        element.onload = () => {
            container.hidden = false;
        };

        element.src = imagePath;

        return true;
    }

    function populateImages() {
        const images = config.images || {};

        const katana = document.getElementById("katanaImage");
        const mainPhoto = document.getElementById("mainPhoto");

        const mainPhotoWrapper = document.querySelector(
            ".main-photo-wrapper"
        );

        const gallery = document.getElementById("memoryGallery");
        const galleryTemplate = document.getElementById(
            "memoryCardTemplate"
        );

        const galleryImages = Array.isArray(images.gallery)
            ? images.gallery
            : [];

        const galleryCaptions = Array.isArray(
            config.content?.journey?.gallery
        )
            ? config.content.journey.gallery
            : [];

        setImage(
            katana,
            images.katana,
            "Ilustrasi katana",
            document.querySelector(".katana-container")
        );

        setImage(
            mainPhoto,
            images.mainPhoto,
            config.recipientName
                ? `Foto ${config.recipientName}`
                : "Foto utama",
            mainPhotoWrapper
        );

        // Background tetap diproses meskipun galeri tidak ditemukan.
        populateSceneBackgrounds(images.backgrounds || {});

        if (
            !gallery ||
            !(galleryTemplate instanceof HTMLTemplateElement)
        ) {
            return;
        }

        gallery.replaceChildren();

        const itemCount = Math.max(
            galleryImages.length,
            galleryCaptions.length
        );

        for (let index = 0; index < itemCount; index += 1) {
            const imagePath = galleryImages[index];
            const itemContent = galleryCaptions[index] || {};

            const captionText = String(
                itemContent.caption || ""
            ).trim();

            const labelText = String(
                itemContent.label || ""
            ).trim();

            if (!String(imagePath || "").trim() && !captionText) {
                continue;
            }

            const fragment = galleryTemplate.content.cloneNode(true);

            const card = fragment.querySelector(".memory-card");

            const imageWrapper = fragment.querySelector(
                ".memory-image-wrapper"
            );

            const image = fragment.querySelector(".memory-image");
            const caption = fragment.querySelector(".memory-caption");
            const label = fragment.querySelector(".memory-index");
            const text = fragment.querySelector(".memory-caption p");

            if (!card || !imageWrapper || !image || !caption || !label || !text) {
                console.warn(
                    "Struktur template galeri tidak lengkap di index.html."
                );
                continue;
            }

            label.textContent = labelText;
            label.hidden = !labelText;

            text.textContent = captionText;
            text.hidden = !captionText;

            caption.hidden = !labelText && !captionText;

            card.dataset.galleryIndex = String(index);

            if (String(imagePath || "").trim()) {
                image.onerror = () => {
                    console.warn(
                        `Gambar galeri gagal dimuat: ${imagePath}`
                    );

                    imageWrapper.hidden = true;

                    if (caption.hidden) {
                        card.hidden = true;
                    }
                };

                image.onload = () => {
                    imageWrapper.hidden = false;
                };

                image.src = imagePath;

                image.alt = String(
                    itemContent.alt || `Foto kenangan ${index + 1}`
                );
            } else {
                imageWrapper.hidden = true;
            }

            gallery.append(fragment);
        }

        gallery.hidden = gallery.children.length === 0;

        gallery.classList.toggle(
            "memory-gallery--single",
            gallery.children.length === 1
        );

        const divider = document.getElementById("journeyDivider");

        if (divider) {
            divider.hidden = gallery.children.length < 2;
        }
    }

    function populateSceneBackgrounds(backgrounds) {
        const sceneBackgrounds = {
            cover: document.querySelector(".cover-background"),
            awakening: document.querySelector(".awakening-background"),
            journey: document.querySelector(".journey-background"),
            oath: document.querySelector(".oath-background"),
            closing: document.querySelector(".closing-background")
        };

        Object.entries(sceneBackgrounds).forEach(([scene, element]) => {
            if (!element) return;

            const imagePath = String(backgrounds[scene] || "").trim();

            element.style.removeProperty("--scene-media-image");

            if (!imagePath) return;

            const image = new Image();

            image.onload = () => {
                element.style.setProperty(
                    "--scene-media-image",
                    `url("${image.src}")`
                );
            };

            image.onerror = () => {
                console.warn(
                    `Background gagal dimuat: ${imagePath}`
                );
            };

            image.src = imagePath;
        });
    }

    // 8. VIDEO BACKGROUND GLOBAL
    function setupBackgroundVideo() {
        if (!backgroundVideo) return;

        const videoPath = String(config.video?.cover || "").trim();

        backgroundVideo.muted = true;
        backgroundVideo.defaultMuted = true;
        backgroundVideo.loop = true;
        backgroundVideo.playsInline = true;
        backgroundVideo.preload = "auto";

        let videoErrorReported = false;

        const handleVideoError = () => {
            if (!videoErrorReported) {
                console.warn(
                    `Video background gagal dimuat: ${videoPath}`
                );

                videoErrorReported = true;
            }

            backgroundVideo.hidden = true;
        };

        backgroundVideo.addEventListener("error", handleVideoError);

        backgroundVideoSource?.addEventListener(
            "error",
            handleVideoError
        );

        if (backgroundVideoSource && videoPath) {
            backgroundVideo.hidden = false;
            backgroundVideoSource.src = videoPath;
            backgroundVideo.load();
        } else {
            backgroundVideo.hidden = true;

            backgroundVideoSource?.removeAttribute("src");

            backgroundVideo.load();

            return;
        }

        const playback = backgroundVideo.play();

        if (playback && typeof playback.catch === "function") {
            playback.catch(() => {
                // Browser dapat menunda autoplay video.
            });
        }
    }

    // 9. MUSIK LATAR
    // Musik tidak dikecilkan atau dihentikan saat transisi.
    function updateMusicButton() {
        if (!musicButton) return;

        const navigation = config.content?.navigation || {};

        const playing = Boolean(
            backgroundMusic && !backgroundMusic.paused
        );

        musicButton.setAttribute("aria-pressed", String(playing));

        musicButton.setAttribute(
            "aria-label",
            playing
                ? navigation.musicDisable || "Matikan musik"
                : navigation.musicEnable || "Nyalakan musik"
        );

        if (musicIcon) {
            musicIcon.textContent = playing ? "Ⅱ" : "♪";
        }
    }

    async function playMusic() {
        if (!backgroundMusic || !backgroundMusic.src) return false;

        if (!backgroundMusic.paused || musicPlayPending) {
            return true;
        }

        musicPlayPending = true;

        try {
            backgroundMusic.volume = musicVolume;

            await backgroundMusic.play();

            updateMusicButton();

            return true;
        } catch (error) {
            updateMusicButton();

            console.info(
                "Pemutaran musik dicegah oleh browser.",
                error
            );

            return false;
        } finally {
            musicPlayPending = false;
        }
    }

    function pauseMusic() {
        if (!backgroundMusic) return;

        backgroundMusic.pause();

        updateMusicButton();
    }

    function setupMusic() {
        if (!backgroundMusic) {
            console.warn(
                "Elemen audio #backgroundMusic tidak ditemukan."
            );

            return;
        }

        const musicPath = String(musicConfig.src || "").trim();

        if (!musicPath) {
            if (musicButton) musicButton.hidden = true;
            return;
        }

        backgroundMusic.src = musicPath;
        backgroundMusic.loop = true;
        backgroundMusic.preload = "auto";
        backgroundMusic.autoplay = false;
        backgroundMusic.volume = musicVolume;

        if (musicButton) {
            musicButton.hidden = false;

            musicButton.addEventListener("click", async (event) => {
                event.preventDefault();
                event.stopPropagation();

                if (backgroundMusic.paused) {
                    await playMusic();
                } else {
                    pauseMusic();
                }
            });
        }

        backgroundMusic.addEventListener("play", updateMusicButton);
        backgroundMusic.addEventListener("pause", updateMusicButton);
        backgroundMusic.addEventListener("ended", updateMusicButton);

        backgroundMusic.addEventListener("error", () => {
            console.warn(`Musik gagal dimuat: ${musicPath}`);

            if (musicButton) {
                musicButton.hidden = true;
            }

            updateMusicButton();
        });

        backgroundMusic.load();

        updateMusicButton();
    }

    // 10. SISTEM NAVIGASI SLIDE
    function getScene(sceneId) {
        return scenes.find((scene) => scene.id === sceneId);
    }

    function getActiveIndex() {
        return scenes.findIndex((scene) =>
            scene.classList.contains("active")
        );
    }

    function setActiveScene(targetScene) {
        if (!targetScene) return;

        scenes.forEach((scene) => {
            const isActive = scene === targetScene;

            scene.classList.toggle("active", isActive);

            scene.setAttribute("aria-hidden", String(!isActive));

            if (isActive) {
                scene.scrollTop = 0;
            }
        });
    }

    function getSceneByIndex(index) {
        if (index < 0 || index >= scenes.length) return null;

        return scenes[index];
    }

    function getSplitClipPath(width, height, angle, keepPositiveSide) {
        if (width <= 0 || height <= 0) {
            return "polygon(0 0, 100% 0, 100% 100%, 0 100%)";
        }

        const radians = (angle * Math.PI) / 180;

        const normalX = -Math.sin(radians);
        const normalY = Math.cos(radians);

        const centerX = width / 2;
        const centerY = height / 2;

        const corners = [
            { x: 0, y: 0 },
            { x: width, y: 0 },
            { x: width, y: height },
            { x: 0, y: height }
        ];

        const signedDistance = ({ x, y }) =>
            (x - centerX) * normalX +
            (y - centerY) * normalY;

        const isInside = (distance) =>
            keepPositiveSide ? distance >= 0 : distance <= 0;

        const clipped = [];

        for (let index = 0; index < corners.length; index += 1) {
            const start = corners[index];
            const end = corners[(index + 1) % corners.length];

            const startDistance = signedDistance(start);
            const endDistance = signedDistance(end);

            const startInside = isInside(startDistance);
            const endInside = isInside(endDistance);

            if (startInside !== endInside) {
                const amount =
                    startDistance /
                    (startDistance - endDistance);

                clipped.push({
                    x: start.x + (end.x - start.x) * amount,
                    y: start.y + (end.y - start.y) * amount
                });
            }

            if (endInside) {
                clipped.push(end);
            }
        }

        const points = clipped.map(({ x, y }) =>
            `${((x / width) * 100).toFixed(3)}% ` +
            `${((y / height) * 100).toFixed(3)}%`
        );

        return `polygon(${points.join(", ")})`;
    }

    async function changeScene(sceneOrId) {
        const targetScene =
            typeof sceneOrId === "string"
                ? getScene(sceneOrId)
                : sceneOrId;

        if (!targetScene || isTransitioning) return;

        const currentScene = scenes[getActiveIndex()];

        if (!currentScene || currentScene === targetScene) return;

        const currentIndex = scenes.indexOf(currentScene);
        const targetIndex = scenes.indexOf(targetScene);

        const variantIndex = currentIndex < targetIndex
            ? currentIndex
            : currentIndex + 3;

        const slashVariant = `slash-variant-${variantIndex}`;

        const slashScars =
            slashTransition?.querySelectorAll(".slash-scar") ?? [];

        isTransitioning = true;

        try {
            if (slashTransition && slashDuration > 0) {
                slashTransition.classList.remove("active");

                slashTransition.classList.remove(
                    ...Array.from(
                        { length: 8 },
                        (_, index) => `slash-variant-${index}`
                    )
                );

                slashTransition.classList.add(slashVariant);

                const scar = slashScars[0];

                const randomBetween = (min, max) =>
                    Math.round(min + Math.random() * (max - min));

                const baseAngle = Number.parseFloat(
                    getComputedStyle(slashTransition)
                        .getPropertyValue("--slash-angle")
                ) || 0;

                const impactAngle = Math.max(
                    -78,
                    Math.min(
                        78,
                        baseAngle + randomBetween(-5, 5)
                    )
                );

                if (scar) {
                    scar.style.setProperty(
                        "--slash-angle",
                        `${impactAngle}deg`
                    );

                    scar.style.setProperty(
                        "--slash-start-y",
                        `${randomBetween(-10, 10)}vh`
                    );

                    scar.style.setProperty("--slash-delay", "0ms");
                }

                const angleRadians = (impactAngle * Math.PI) / 180;

                const splitDistance =
                    Math.max(
                        window.innerWidth,
                        window.innerHeight
                    ) * 0.075;

                const splitX =
                    -Math.sin(angleRadians) * splitDistance;

                const splitY =
                    Math.cos(angleRadians) * splitDistance;

                const splitHalves =
                    slashTransition.querySelectorAll(".slash-half");

                const impact =
                    slashTransition.querySelector(".slash-impact");

                splitHalves.forEach((half, index) => {
                    const keepPositiveSide = index === 0;
                    const direction = keepPositiveSide ? 1 : -1;

                    half.style.clipPath = getSplitClipPath(
                        window.innerWidth,
                        window.innerHeight,
                        impactAngle,
                        keepPositiveSide
                    );

                    half.style.setProperty(
                        "--split-x",
                        `${splitX * direction}px`
                    );

                    half.style.setProperty(
                        "--split-y",
                        `${splitY * direction}px`
                    );

                    half.style.setProperty(
                        "--split-end-x",
                        `${splitX * direction * 1.18}px`
                    );

                    half.style.setProperty(
                        "--split-end-y",
                        `${splitY * direction * 1.18}px`
                    );
                });

                impact?.style.setProperty(
                    "--impact-angle",
                    `${impactAngle}deg`
                );

                void slashTransition.offsetWidth;

                slashTransition.classList.add("active");

                playSlashSound(variantIndex);
            }

            const switchDelay = prefersReducedMotion
                ? 0
                : Math.min(
                    160,
                    slashDuration * 0.3,
                    sceneDuration * 0.45
                );

            await wait(switchDelay);

            setActiveScene(targetScene);

            await wait(
                Math.max(
                    80,
                    slashDuration - switchDelay,
                    sceneDuration * 0.45
                )
            );
        } catch (error) {
            console.error("Gagal mengganti slide:", error);
        } finally {
            if (slashTransition) {
                slashTransition.classList.remove("active");
                slashTransition.classList.remove(slashVariant);

                slashScars.forEach((scar) => {
                    [
                        "--slash-angle",
                        "--slash-start-y",
                        "--slash-delay"
                    ].forEach((property) => {
                        scar.style.removeProperty(property);
                    });
                });

                slashTransition
                    .querySelectorAll(".slash-half")
                    .forEach((half) => {
                        half.style.removeProperty("clip-path");
                        half.style.removeProperty("--split-x");
                        half.style.removeProperty("--split-y");
                        half.style.removeProperty("--split-end-x");
                        half.style.removeProperty("--split-end-y");
                    });

                slashTransition
                    .querySelector(".slash-impact")
                    ?.style.removeProperty("--impact-angle");
            }

            isTransitioning = false;
        }
    }

    function goToNextScene() {
        if (isTransitioning) return false;

        const nextScene = getSceneByIndex(getActiveIndex() + 1);

        if (!nextScene) return false;

        changeScene(nextScene);

        return true;
    }

    function goToPreviousScene() {
        if (isTransitioning) return false;

        const previousScene = getSceneByIndex(getActiveIndex() - 1);

        if (!previousScene) return false;

        changeScene(previousScene);

        return true;
    }

    // 11. TOMBOL BUKA UNDANGAN
    if (openInvitationButton) {
        openInvitationButton.addEventListener("click", () => {
            playMusic();

            if (backgroundVideo?.paused) {
                const playback = backgroundVideo.play();

                if (playback && typeof playback.catch === "function") {
                    playback.catch(() => {});
                }
            }

            changeScene("awakening");
        });
    }

    // 12. HILANGKAN TOMBOL NEXT
    document
        .querySelectorAll("[data-next], .next-button")
        .forEach((button) => {
            button.hidden = true;
            button.setAttribute("aria-hidden", "true");
            button.tabIndex = -1;
        });

    // 13. SCROLL MOUSE / TRACKPAD
    window.addEventListener(
        "wheel",
        (event) => {
            if (
                event.ctrlKey ||
                isInteractiveElement(event.target)
            ) {
                return;
            }

            if (Math.abs(event.deltaY) < 12) return;

            const direction = event.deltaY > 0 ? 1 : -1;
            const activeScene = getActiveScene();

            if (canScrollScene(activeScene, direction)) {
                return;
            }

            event.preventDefault();

            if (isTransitioning || wheelLocked) return;

            const sceneChanged = direction > 0
                ? goToNextScene()
                : goToPreviousScene();

            if (!sceneChanged) return;

            wheelLocked = true;

            window.clearTimeout(wheelUnlockTimer);

            wheelUnlockTimer = window.setTimeout(() => {
                wheelLocked = false;
            }, Math.max(550, sceneDuration));
        },
        { passive: false }
    );

    // 14. SWIPE HP / TABLET
    window.addEventListener(
        "touchstart",
        (event) => {
            const touch = event.changedTouches[0];

            if (!touch) return;

            touchStartX = touch.clientX;
            touchStartY = touch.clientY;

            touchStartedOnControl =
                isInteractiveElement(event.target);

            const activeScene = getActiveScene();

            touchStartScrollTop = activeScene
                ? activeScene.scrollTop
                : 0;
        },
        { passive: true }
    );

    window.addEventListener(
        "touchend",
        (event) => {
            if (isTransitioning || touchStartedOnControl) return;

            const touch = event.changedTouches[0];

            if (!touch) return;

            const differenceX = touch.clientX - touchStartX;
            const differenceY = touch.clientY - touchStartY;

            const activeScene = getActiveScene();

            if (
                Math.abs(differenceY) < 45 ||
                Math.abs(differenceY) <
                    Math.abs(differenceX) * 1.2
            ) {
                return;
            }

            if (
                activeScene &&
                Math.abs(
                    activeScene.scrollTop - touchStartScrollTop
                ) > 2
            ) {
                return;
            }

            const direction = differenceY < 0 ? 1 : -1;

            if (canScrollScene(activeScene, direction)) {
                return;
            }

            if (direction > 0) {
                goToNextScene();
            } else {
                goToPreviousScene();
            }
        },
        { passive: true }
    );

    // 15. KLIK LATAR SLIDE
    scenes.forEach((scene) => {
        scene.addEventListener("click", (event) => {
            if (isTransitioning) return;
            if (isInteractiveElement(event.target)) return;

            const selection = window.getSelection();

            if (selection && !selection.isCollapsed) return;

            if (event.target.closest(".scene-content")) {
                goToNextScene();
                return;
            }

            const bounds = scene.getBoundingClientRect();

            if (event.clientX < bounds.left + bounds.width / 2) {
                goToPreviousScene();
            } else {
                goToNextScene();
            }
        });
    });

    // 16. NAVIGASI KEYBOARD
    document.addEventListener("keydown", (event) => {
        if (isInteractiveElement(event.target)) return;

        if (
            event.key === "ArrowDown" ||
            event.key === "ArrowRight" ||
            event.key === "PageDown" ||
            event.key === " "
        ) {
            event.preventDefault();
            goToNextScene();
        }

        if (
            event.key === "ArrowUp" ||
            event.key === "ArrowLeft" ||
            event.key === "PageUp"
        ) {
            event.preventDefault();
            goToPreviousScene();
        }

        if (event.key === "Home") {
            event.preventDefault();
            changeScene(scenes[0]);
        }

        if (event.key === "End") {
            event.preventDefault();
            changeScene(scenes[scenes.length - 1]);
        }
    });

    // 17. TOMBOL WHATSAPP
    function setupWhatsApp() {
        const whatsappButton =
            document.getElementById("whatsappButton");

        if (!whatsappButton) return;

        const whatsappConfig = config.whatsapp || {};

        const phoneNumber = String(
            whatsappConfig.number || ""
        ).replace(/\D/g, "");

        const message = String(
            whatsappConfig.message || ""
        ).trim();

        if (!phoneNumber) {
            whatsappButton.removeAttribute("href");
            whatsappButton.setAttribute("aria-disabled", "true");
            whatsappButton.hidden = true;

            console.warn(
                "Nomor WhatsApp belum diatur di config.js."
            );

            return;
        }

        whatsappButton.hidden = false;

        whatsappButton.setAttribute(
            "aria-label",
            config.content?.closing?.whatsappAriaLabel ||
                "Pesan template melalui WhatsApp"
        );

        whatsappButton.href =
            `https://wa.me/${phoneNumber}` +
            (message ? `?text=${encodeURIComponent(message)}` : "");

        whatsappButton.target = "_blank";
        whatsappButton.rel = "noopener noreferrer";

        whatsappButton.removeAttribute("aria-disabled");
    }

    // 18. INISIALISASI
    populateContent();
    populateImages();
    initializeSlashAudio();
    setupBackgroundVideo();
    setupMusic();
    setupWhatsApp();

    scenes.forEach((scene) => {
        scene.classList.remove("active");
        scene.setAttribute("aria-hidden", "true");
        scene.scrollTop = 0;
    });

    const initialScene = getScene("cover") || scenes[0];

    if (initialScene) {
        setActiveScene(initialScene);
    }

    console.log("The Last Ronin berhasil diinisialisasi.");
});