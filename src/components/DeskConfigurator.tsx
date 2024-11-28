import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const materials = [
  "/assets/materials/top_ashwood_mat.glb",
  "/assets/materials/top_cedar_mat.glb",
  "/assets/materials/top_plastic_black_mat.glb",
  "/assets/materials/top_plastic_white_mat.glb",
  "/assets/materials/top_walnut_mat.glb",
];

const supportOptions = [
  "/assets/models/prop_01.glb",
  "/assets/models/prop_02.glb",
];
type SectionKeys = "materials" | "dimensions" | "supports";

const DeskConfigurator: React.FC = () => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<THREE.Scene | null>(new THREE.Scene());

  const [legHeight, setLegHeight] = useState(800); // Legs height
  const [deskWidth, setDeskWidth] = useState(1200); // Desk width
  const [deskDepth, setDeskDepth] = useState(600); // Desk depth
  const [deskMaterial, setDeskMaterial] = useState<number>(0); // Materials for desk(glb)
  const [supportOption, setSupportOption] = useState<number>(0); // Supports(glb)

  const [deskTop, setDeskTop] = useState<THREE.Object3D | null>(null);
  const [supports, setSupports] = useState<THREE.Group | null>(null);
  const [legs, setLegs] = useState<THREE.Group | null>(null);

  const modelsLoaded = useRef(false);

  const [openSections, setOpenSections] = useState({
    materials: true,
    dimensions: true,
    supports: true,
  });

  const toggleSection = (section: SectionKeys) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const loader = new GLTFLoader();

  // Table load
  const loadDeskTop = useCallback(
    (materialPath: string): Promise<THREE.Object3D> => {
      return new Promise((resolve, reject) => {
        loader.load(
          materialPath,
          (gltf) => {
            const deskTop = gltf.scene;
            deskTop.position.set(0, 0, 0);
            deskTop.scale.set(
              10,
              (0.3 * deskDepth) / 600,
              (5 * deskWidth) / 1000
            );
            deskTop.castShadow = true;
            deskTop.receiveShadow = true;
            resolve(deskTop);
          },
          undefined,
          (error) => reject(error)
        );
      });
    },
    [deskWidth, deskDepth]
  );

  // Support of legs load
  const loadSupports = useCallback(
    (supportPath: string): Promise<THREE.Group> => {
      return new Promise((resolve, reject) => {
        loader.load(
          supportPath,
          (gltf) => {
            const supportsGroup = new THREE.Group();
            const supportModel = gltf.scene;
            const positions = [
              { x: -0.45, z: -0.15 },
              { x: 0.45, z: -0.15 },
              { x: -0.45, z: 0.15 },
              { x: 0.45, z: 0.15 },
            ];

            positions.forEach((pos) => {
              const supportClone = supportModel.clone();
              supportClone.position.set(
                pos.x,
                -legHeight / 1000 / 2 + 0.01,
                (pos.z * deskWidth) / 1000
              );
              supportClone.castShadow = true;
              supportClone.receiveShadow = true;
              supportsGroup.add(supportClone);
            });

            resolve(supportsGroup);
          },
          undefined,
          (error) => reject(error)
        );
      });
    },
    []
  );

  // Table legs load
  const loadLegs = useCallback((): Promise<THREE.Group> => {
    return new Promise((resolve, reject) => {
      loader.load(
        "/assets/models/leg.glb",
        (gltf) => {
          const group = new THREE.Group();
          const leftLeg = gltf.scene.clone();
          const rightLeg = gltf.scene.clone();
          leftLeg.scale.set((1.3 * deskWidth) / 1000, legHeight / 1000, 1);
          rightLeg.scale.set((1.3 * deskWidth) / 1000, legHeight / 1000, 1);
          leftLeg.position.set(-0.45, 0.01, 0);
          rightLeg.position.set(0.45, 0.01, 0);
          leftLeg.rotation.set(Math.PI, Math.PI / 2, 0);
          rightLeg.rotation.set(Math.PI, Math.PI / 2, 0);
          group.add(leftLeg);
          group.add(rightLeg);

          resolve(group);
        },
        undefined,
        (error) => reject(error)
      );
    });
  }, []);

  // Scene init
  useEffect(() => {
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0.2, 0.2, 1);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    if (sceneRef.current) {
      sceneRef.current.innerHTML = "";
      sceneRef.current.appendChild(renderer.domElement);
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene!.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 1, 0);
    scene!.add(directionalLight);

    const planeGeometry = new THREE.PlaneGeometry(5000, 5000);
    const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(0, -legHeight / 1000, 0);
    plane.receiveShadow = true;
    scene!.add(plane);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene!, camera);
    };

    animate();
    return () => {
      renderer.dispose();
    };
  }, []);

  // Load all models
  useEffect(() => {
    if (!modelsLoaded.current) {
      const loadAllModels = async () => {
        try {
          modelsLoaded.current = true;

          const deskTopModel = await loadDeskTop(materials[deskMaterial]);
          const supportsModel = await loadSupports(
            supportOptions[supportOption]
          );
          const legsModel = await loadLegs();

          setDeskTop(deskTopModel);
          setSupports(supportsModel);
          setLegs(legsModel);

          scene!.add(deskTopModel);
          scene!.add(supportsModel);
          scene!.add(legsModel);
        } catch (error) {
          console.error("Ошибка загрузки модели:", error);
        }
      };

      loadAllModels();
    }
  }, []);

  // Update desktop material, width and depth
  useEffect(() => {
    if (deskTop && scene) {
      deskTop.scale.set(10, (0.3 * deskDepth) / 600, (5 * deskWidth) / 1000);

      const materialPath = materials[deskMaterial];
      loadDeskTop(materialPath).then((newDeskTop) => {
        if (newDeskTop !== deskTop) {
          scene.remove(deskTop);
          scene.add(newDeskTop);
          setDeskTop(newDeskTop);
        }
      });
    }
  }, [deskWidth, deskDepth, deskMaterial, loadDeskTop, scene]);

  // Update legs scale
  useEffect(() => {
    if (legs && supports) {
      legs.children.forEach((leg) => {
        leg.scale.set((1.3 * deskWidth) / 1000, legHeight / 1000, 1);
      });

      supports.children.forEach((support) => {
        support.position.set(
          support.position.x,
          -legHeight / 1000 / 2 + 0.01,
          support.position.z
        );
        support.updateMatrix();
      });
    }
  }, [deskWidth, legHeight, deskWidth]);

  // Update supports
  useEffect(() => {
    if (supports && scene) {
      const supportPath = supportOptions[supportOption];
      loadSupports(supportPath).then((newSupports) => {
        if (newSupports !== supports) {
          scene.remove(supports);
          scene.add(newSupports);
          setSupports(newSupports);
          newSupports.children.forEach((support) => {
            support.position.set(
              support.position.x,
              -legHeight / 1000 / 2 + 0.01,
              support.position.z
            );
            support.updateMatrix();
          });
        }
      });
    }
  }, [supportOption]);
  return (
    <div className="configurator-container">
      <div className="scene-container" ref={sceneRef} />
      <div className="edit-menu">
        <h3>Настройки стола</h3>
        <div className="section">
          <div
            className="section-header"
            onClick={() => toggleSection("materials")}
          >
            <span>Материал: </span>
            <span
              className={`arrow ${openSections.materials ? "up" : "down"}`}
            />
          </div>
          {openSections.materials && (
            <div className="section-content">
              <div className="material-selector">
                <button
                  className="circle-button wood"
                  onClick={() => setDeskMaterial(0)}
                ></button>
                <button
                  className="circle-button cedar"
                  onClick={() => setDeskMaterial(1)}
                ></button>
                <button
                  className="circle-button black"
                  onClick={() => setDeskMaterial(2)}
                ></button>
                <button
                  className="circle-button white"
                  onClick={() => setDeskMaterial(3)}
                ></button>
                <button
                  className="circle-button walnut"
                  onClick={() => setDeskMaterial(4)}
                ></button>
              </div>
            </div>
          )}
        </div>
        <div className="section">
          <div
            className="section-header"
            onClick={() => toggleSection("dimensions")}
          >
            <span>Размеры: </span>
            <span
              className={`arrow ${openSections.dimensions ? "up" : "down"}`}
            />
          </div>
          {openSections.dimensions && (
            <div className="section-content">
              <label>Высота ножек (мм):</label>
              <input
                type="range"
                min="500"
                max="1200"
                step="1"
                value={legHeight}
                onChange={(e) => setLegHeight(parseInt(e.target.value))}
              />
              <span>{legHeight} мм</span>
              <label>Ширина столешницы (мм):</label>
              <input
                type="range"
                min="1200"
                max="2400"
                step="1"
                value={deskWidth}
                onChange={(e) => setDeskWidth(parseInt(e.target.value))}
              />
              <span>{deskWidth} мм</span>
              <label>Глубина столешницы (мм):</label>
              <input
                type="range"
                min="300"
                max="900"
                step="1"
                value={deskDepth}
                onChange={(e) => setDeskDepth(parseInt(e.target.value))}
              />
              <span>{deskDepth} мм</span>
            </div>
          )}
        </div>
        <div className="section">
          <div
            className="section-header"
            onClick={() => toggleSection("supports")}
          >
            <span>Опоры: </span>
            <span
              className={`arrow ${openSections.supports ? "up" : "down"}`}
            />
          </div>
          {openSections.supports && (
            <div className="section-content">
              <div className="button-group">
                <button
                  className={supportOption === 0 ? "active" : ""}
                  onClick={() => setSupportOption(0)}
                >
                  Вариант 1
                </button>
                <button
                  className={supportOption === 1 ? "active" : ""}
                  onClick={() => setSupportOption(1)}
                >
                  Вариант 2
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeskConfigurator;
