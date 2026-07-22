window.HELP_IMPROVE_VIDEOJS = false;

var INTERP_BASE = "./static/interpolation/stacked";
var NUM_INTERP_FRAMES = 240;
var HEATMAP_MAX_POINTS = 3000;
var HEATMAP_SOURCE_PLY = "./MAV_Images.ply";

var interp_images = [];
function preloadInterpolationImages() {
  for (var i = 0; i < NUM_INTERP_FRAMES; i++) {
    var path = INTERP_BASE + '/' + String(i).padStart(6, '0') + '.jpg';
    interp_images[i] = new Image();
    interp_images[i].src = path;
  }
}

function downsamplePointCloudGeometry(geometry, targetCount) {
  var position = geometry.getAttribute("position");
  if (!position || position.count <= targetCount) {
    return geometry;
  }

  var stride = Math.ceil(position.count / targetCount);
  var outCount = Math.ceil(position.count / stride);
  var downPos = new Float32Array(outCount * 3);
  var color = geometry.getAttribute("color");
  var hasColor = color && color.count === position.count;
  var downColor;

  if (hasColor) {
    downColor = new Float32Array(outCount * 3);
  }

  var out = 0;
  for (var i = 0; i < position.count; i += stride) {
    var src = i * 3;
    var dst = out * 3;
    downPos[dst] = position.array[src];
    downPos[dst + 1] = position.array[src + 1];
    downPos[dst + 2] = position.array[src + 2];

    if (hasColor) {
      downColor[dst] = color.array[src];
      downColor[dst + 1] = color.array[src + 1];
      downColor[dst + 2] = color.array[src + 2];
    }

    out++;
  }

  var downGeom = new THREE.BufferGeometry();
  downGeom.setAttribute("position", new THREE.BufferAttribute(downPos, 3));
  if (hasColor) {
    downGeom.setAttribute("color", new THREE.BufferAttribute(downColor, 3));
  }

  return downGeom;
}

function fitHeatmapCameraToObject(camera, controls, object) {
  var box = new THREE.Box3().setFromObject(object);
  var center = new THREE.Vector3();
  var size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  if (size.x === 0 && size.y === 0 && size.z === 0) {
    return;
  }

  var maxDim = Math.max(size.x, size.y, size.z);
  var fov = camera.fov * (Math.PI / 180);
  var distance = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
  distance *= 2.0;
  var eye = new THREE.Vector3(1, 0.5, 1).normalize();

  camera.position.copy(center.clone().add(eye.multiplyScalar(distance)));
  camera.near = Math.max(0.01, distance * 0.05);
  camera.far = distance * 20;
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.update();
}

function initInteractiveHeatmapViewer() {
  var container = document.getElementById("interactive-heatmap-viewer");
  if (!container || !window.THREE || !window.THREE.PLYLoader) {
    return;
  }

  var width = container.clientWidth;
  var height = container.clientHeight;
  if (width === 0 || height === 0) {
    return;
  }

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111827);

  var camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
  var renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "low-power" });
  renderer.setSize(width, height);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x111827, 1);
  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));

  var loader = new THREE.PLYLoader();
  var points;
  loader.load(
    HEATMAP_SOURCE_PLY,
    function(geometry) {
      geometry = downsamplePointCloudGeometry(geometry, HEATMAP_MAX_POINTS);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();

      var material;
      if (geometry.attributes.color) {
        material = new THREE.PointsMaterial({
          size: 0.01,
          sizeAttenuation: false,
          vertexColors: true,
          transparent: false
        });
      } else {
        material = new THREE.PointsMaterial({
          size: 0.01,
          sizeAttenuation: false,
          color: 0x3d8bfd,
          transparent: false
        });
      }

      points = new THREE.Points(geometry, material);
      scene.add(points);
      fitHeatmapCameraToObject(camera, controls, points);

      var box = new THREE.Box3().setFromObject(points);
      var size = box.getSize(new THREE.Vector3());
      var maxDim = Math.max(size.x, size.y, size.z);
      material.size = Math.max(0.008, maxDim * 0.0025);
      var render = function() {
        renderer.render(scene, camera);
      };

      controls.addEventListener("change", function() {
        render();
      });
      render();
    },
    undefined,
    function(error) {
      container.innerHTML = '<p class="heatmap-loading-note">Unable to load the interactive heatmap.</p>';
      console.error("Failed to load PLY:", error);
    }
  );

  window.addEventListener("resize", function() {
    var w = container.clientWidth;
    var h = container.clientHeight;
    if (w === 0 || h === 0) {
      return;
    }
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (points) {
      fitHeatmapCameraToObject(camera, controls, points);
    }
    renderer.render(scene, camera);
  });
}

function setInterpolationImage(i) {
  var image = interp_images[i];
  image.ondragstart = function() { return false; };
  image.oncontextmenu = function() { return false; };
  $('#interpolation-image-wrapper').empty().append(image);
}


$(document).ready(function() {
    // Check for click events on the navbar burger icon
    $(".navbar-burger").click(function() {
      // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
      $(".navbar-burger").toggleClass("is-active");
      $(".navbar-menu").toggleClass("is-active");

    });

    var options = {
			slidesToScroll: 1,
			slidesToShow: 3,
			loop: true,
			infinite: true,
			autoplay: false,
			autoplaySpeed: 3000,
    }

		// Initialize all div with carousel class
    var carousels = bulmaCarousel.attach('.carousel', options);

    // Loop on each carousel initialized
    for(var i = 0; i < carousels.length; i++) {
		// Add listener to  event
		carousels[i].on('before:show', state => {
			console.log(state);
		});
    }

    // Access to bulmaCarousel instance of an element
    var element = document.querySelector('#my-element');
    if (element && element.bulmaCarousel) {
    	// bulmaCarousel instance is available as element.bulmaCarousel
    	element.bulmaCarousel.on('before-show', function(state) {
    		console.log(state);
    	});
    }

    /*var player = document.getElementById('interpolation-video');
    player.addEventListener('loadedmetadata', function() {
      $('#interpolation-slider').on('input', function(event) {
        console.log(this.value, player.duration);
        player.currentTime = player.duration / 100 * this.value;
      })
    }, false);*/
    var interpSlider = document.getElementById("interpolation-slider");
    if (interpSlider) {
      preloadInterpolationImages();
      $('#interpolation-slider').on('input', function(event) {
        setInterpolationImage(this.value);
      });
      setInterpolationImage(0);
      $('#interpolation-slider').prop('max', NUM_INTERP_FRAMES - 1);
      bulmaSlider.attach();
    }

    var processVideo = document.getElementById("process-video");
    if (processVideo) {
      processVideo.addEventListener("loadedmetadata", function() {
        if (processVideo.duration > 3) {
          processVideo.currentTime = 3;
        }
      }, { once: true });

      processVideo.addEventListener("play", function() {
        if (processVideo.currentTime < 3) {
          processVideo.currentTime = 3;
        }
      });
    }

    initInteractiveHeatmapViewer();

})
