const inputImageElement = document.getElementById("imageInput");
const outputImageElement = document.getElementById("outputImage");
const errorMessage = document.getElementById("errorMessage");
const usageElement = document.getElementById("tileUsage");

let colorMap = [];
fetch('assets/color_map.json')
    .then(response => response.json())
    .then(data => {
        colorMap = data;
        console.log("Color map loaded", colorMap);
    })
    .catch(error => console.error('Error loading color map:', error));

inputImageElement.addEventListener("change", handleImageUpload);

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                convertToTileImage(img);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

async function convertToTileImage(inputImg) {
    try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = inputImg.width;
        canvas.height = inputImg.height;
        ctx.drawImage(inputImg, 0, 0);

        const imageData = ctx.getImageData(0, 0, inputImg.width, inputImg.height);
        const pixels = imageData.data;

        const outputCanvas = document.createElement("canvas");
        const outputCtx = outputCanvas.getContext("2d");
        outputCanvas.width = inputImg.width * 16;
        outputCanvas.height = inputImg.height * 16;

        const tilePromises = [];
        const tileUsageCount = {};

        for (let y = 0; y < inputImg.height; y++) {
            for (let x = 0; x < inputImg.width; x++) {
                const idx = (y * inputImg.width + x) * 4;
                const r = pixels[idx];
                const g = pixels[idx + 1];
                const b = pixels[idx + 2];
                const a = pixels[idx + 3];
                if (a == 0) continue;
                let closestTile = findClosestTile(r, g, b);

                if (closestTile) {
                    const tileImg = new Image();
                    const tileImgPromise = new Promise((resolve) => {
                        tileImg.onload = function () {
                            outputCtx.drawImage(tileImg, x * 16, y * 16, 16, 16);
                            resolve();
                        };
                        tileImg.src = `assets/tiles/${closestTile}`;
                    });
                    tilePromises.push(tileImgPromise);

                    tileUsageCount[closestTile] = (tileUsageCount[closestTile] || 0) + 1;
                } else {
                    console.warn(`No tile found for color (${r}, ${g}, ${b})`);
                }
            }
        }

        await Promise.all(tilePromises);

        if (tilePromises.length > 0) {
            outputImageElement.src = outputCanvas.toDataURL();
            document.getElementById('imageAndSummary').style.display = 'flex';
            errorMessage.style.display = 'none';

            displayTileUsage(tileUsageCount);
        } else {
            document.getElementById('imageAndSummary').style.display = 'none';
            errorMessage.style.display = 'flex';
        }
    } catch (error) {
        console.error('Error occurred during image conversion:', error);
        document.getElementById('imageAndSummary').style.display = 'none';
        errorMessage.style.display = 'flex';
    }
}

function displayTileUsage(tileUsageCount) {
    //usageElement.style.display = 'flex';
    usageElement.innerHTML = "";
    const usageList = document.createElement("ul");
    const sorted = Object.entries(tileUsageCount).sort((a, b) => {
        const tileA = a[0];
        const tileB = b[0];
        return tileA.localeCompare(tileB);
    });
    for (const [tile, count] of sorted) {
        const listItem = document.createElement("li");
        listItem.textContent = `${tile.replace(".png", "")}: ${count}`;
        usageList.appendChild(listItem);
    }
    usageElement.appendChild(usageList);
}

function findClosestTile(r, g, b) {
    let closestTile = null;
    let minDistance = Infinity;

    colorMap.forEach(tile => {
        const [tileR, tileG, tileB] = tile.color;
        const distance = Math.sqrt(
            Math.pow(r - tileR, 2) + Math.pow(g - tileG, 2) + Math.pow(b - tileB, 2)
        );

        if (distance < minDistance) {
            minDistance = distance;
            closestTile = tile.image;
        }
    });

    return closestTile;
}