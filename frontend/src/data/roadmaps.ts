export interface RoadmapStep {
  step: number;
  title: string;
  description: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  resources: { label: string; url: string }[];
}

export interface Roadmap {
  technologyId: string;
  technologyName: string;
  description: string;
  icon: string;
  estimatedWeeks: number;
  steps: RoadmapStep[];
}

export const roadmaps: Record<string, Roadmap> = {
  "ai-ml": {
    technologyId: "ai-ml",
    technologyName: "AI / Machine Learning",
    description: "From Python fundamentals to deploying production ML models and working with LLMs.",
    icon: "🧠",
    estimatedWeeks: 24,
    steps: [
      {
        step: 1,
        title: "Python Programming Fundamentals",
        description: "Master Python syntax, data structures, OOP, and essential libraries like NumPy and Pandas.",
        level: "Beginner",
        resources: [
          { label: "Python Official Tutorial", url: "https://docs.python.org/3/tutorial/" },
          { label: "Automate the Boring Stuff", url: "https://automatetheboringstuff.com/" },
        ],
      },
      {
        step: 2,
        title: "Mathematics for ML",
        description: "Linear algebra, calculus, probability, and statistics — the math behind every ML algorithm.",
        level: "Beginner",
        resources: [
          { label: "3Blue1Brown Linear Algebra", url: "https://www.3blue1brown.com/topics/linear-algebra" },
          { label: "Khan Academy Statistics", url: "https://www.khanacademy.org/math/statistics-probability" },
        ],
      },
      {
        step: 3,
        title: "Core ML Algorithms",
        description: "Supervised and unsupervised learning: regression, classification, clustering, decision trees, SVMs.",
        level: "Intermediate",
        resources: [
          { label: "Scikit-learn Documentation", url: "https://scikit-learn.org/stable/user_guide.html" },
          { label: "Andrew Ng's ML Course", url: "https://www.coursera.org/learn/machine-learning" },
        ],
      },
      {
        step: 4,
        title: "Deep Learning & Neural Networks",
        description: "CNNs, RNNs, Transformers — build and train neural networks with PyTorch or TensorFlow.",
        level: "Intermediate",
        resources: [
          { label: "Fast.ai Practical DL", url: "https://course.fast.ai/" },
          { label: "PyTorch Tutorials", url: "https://pytorch.org/tutorials/" },
        ],
      },
      {
        step: 5,
        title: "LLMs & Prompt Engineering",
        description: "Work with large language models, fine-tuning, RAG pipelines, and AI agents.",
        level: "Advanced",
        resources: [
          { label: "Hugging Face Course", url: "https://huggingface.co/course" },
          { label: "LangChain Documentation", url: "https://docs.langchain.com/" },
        ],
      },
      {
        step: 6,
        title: "MLOps & Deployment",
        description: "Model serving, monitoring, CI/CD for ML, and production deployment patterns.",
        level: "Advanced",
        resources: [
          { label: "MLflow Documentation", url: "https://mlflow.org/docs/latest/index.html" },
          { label: "Made With ML - MLOps", url: "https://madewithml.com/" },
        ],
      },
    ],
  },
  "web3": {
    technologyId: "web3",
    technologyName: "Web3 / Blockchain",
    description: "Learn blockchain fundamentals, smart contract development, and decentralized app building.",
    icon: "⛓️",
    estimatedWeeks: 16,
    steps: [
      {
        step: 1,
        title: "Blockchain Fundamentals",
        description: "Understand distributed ledgers, consensus mechanisms, cryptographic hashing, and Merkle trees.",
        level: "Beginner",
        resources: [
          { label: "Bitcoin Whitepaper", url: "https://bitcoin.org/bitcoin.pdf" },
          { label: "Blockchain Demo", url: "https://andersbrownworth.com/blockchain/" },
        ],
      },
      {
        step: 2,
        title: "Solidity & Smart Contracts",
        description: "Write, test, and deploy smart contracts on Ethereum using Solidity and Hardhat.",
        level: "Intermediate",
        resources: [
          { label: "CryptoZombies", url: "https://cryptozombies.io/" },
          { label: "Solidity by Example", url: "https://solidity-by-example.org/" },
        ],
      },
      {
        step: 3,
        title: "DApp Development",
        description: "Build full-stack decentralized applications with ethers.js, wagmi, and frontend frameworks.",
        level: "Intermediate",
        resources: [
          { label: "Ethereum.org Developers", url: "https://ethereum.org/en/developers/" },
          { label: "wagmi Documentation", url: "https://wagmi.sh/" },
        ],
      },
      {
        step: 4,
        title: "DeFi & Advanced Protocols",
        description: "Understand AMMs, lending protocols, oracles, and cross-chain bridges.",
        level: "Advanced",
        resources: [
          { label: "Uniswap V3 Docs", url: "https://docs.uniswap.org/" },
          { label: "Chainlink Docs", url: "https://docs.chain.link/" },
        ],
      },
    ],
  },
  "cybersecurity": {
    technologyId: "cybersecurity",
    technologyName: "Cybersecurity",
    description: "From networking basics to penetration testing and zero-trust architecture.",
    icon: "🛡️",
    estimatedWeeks: 20,
    steps: [
      {
        step: 1,
        title: "Networking & Linux Fundamentals",
        description: "TCP/IP, DNS, HTTP, firewalls, and command-line Linux administration.",
        level: "Beginner",
        resources: [
          { label: "TryHackMe Pre-Security", url: "https://tryhackme.com/path/outline/presecurity" },
          { label: "Linux Journey", url: "https://linuxjourney.com/" },
        ],
      },
      {
        step: 2,
        title: "Security Concepts & Cryptography",
        description: "CIA triad, encryption, PKI, hashing, digital signatures, and common attack vectors.",
        level: "Beginner",
        resources: [
          { label: "OverTheWire Wargames", url: "https://overthewire.org/wargames/" },
          { label: "Crypto101 Handbook", url: "https://www.crypto101.io/" },
        ],
      },
      {
        step: 3,
        title: "Penetration Testing",
        description: "Web application security, OWASP Top 10, Burp Suite, Metasploit, and vulnerability assessment.",
        level: "Intermediate",
        resources: [
          { label: "PortSwigger Web Security Academy", url: "https://portswigger.net/web-security" },
          { label: "HackTheBox", url: "https://www.hackthebox.com/" },
        ],
      },
      {
        step: 4,
        title: "SOC & Incident Response",
        description: "SIEM tools, log analysis, threat hunting, and incident response procedures.",
        level: "Intermediate",
        resources: [
          { label: "Blue Team Labs", url: "https://blueteamlabs.online/" },
          { label: "SANS Reading Room", url: "https://www.sans.org/white-papers/" },
        ],
      },
      {
        step: 5,
        title: "Zero Trust & Cloud Security",
        description: "Zero-trust architecture, cloud security posture management, and DevSecOps practices.",
        level: "Advanced",
        resources: [
          { label: "NIST Zero Trust Architecture", url: "https://www.nist.gov/publications/zero-trust-architecture" },
          { label: "AWS Security Best Practices", url: "https://docs.aws.amazon.com/security/" },
        ],
      },
    ],
  },
  "cloud-native": {
    technologyId: "cloud-native",
    technologyName: "Cloud Native",
    description: "Master containers, Kubernetes, serverless, and cloud-native architecture patterns.",
    icon: "☁️",
    estimatedWeeks: 18,
    steps: [
      {
        step: 1,
        title: "Docker & Containers",
        description: "Container fundamentals, Dockerfiles, multi-stage builds, Docker Compose, and image optimization.",
        level: "Beginner",
        resources: [
          { label: "Docker Getting Started", url: "https://docs.docker.com/get-started/" },
          { label: "Play with Docker", url: "https://labs.play-with-docker.com/" },
        ],
      },
      {
        step: 2,
        title: "Kubernetes Fundamentals",
        description: "Pods, Services, Deployments, ConfigMaps, Secrets, and kubectl mastery.",
        level: "Intermediate",
        resources: [
          { label: "Kubernetes Official Docs", url: "https://kubernetes.io/docs/tutorials/" },
          { label: "KillerCoda Scenarios", url: "https://killercoda.com/kubernetes" },
        ],
      },
      {
        step: 3,
        title: "Serverless & FaaS",
        description: "AWS Lambda, Azure Functions, Vercel Edge Functions, and event-driven architectures.",
        level: "Intermediate",
        resources: [
          { label: "Serverless Framework", url: "https://www.serverless.com/framework/docs" },
          { label: "AWS Lambda Guide", url: "https://docs.aws.amazon.com/lambda/" },
        ],
      },
      {
        step: 4,
        title: "Service Mesh & Observability",
        description: "Istio, Linkerd, distributed tracing, metrics, and cloud-native observability stack.",
        level: "Advanced",
        resources: [
          { label: "Istio Documentation", url: "https://istio.io/latest/docs/" },
          { label: "OpenTelemetry Docs", url: "https://opentelemetry.io/docs/" },
        ],
      },
    ],
  },
  "edge-computing": {
    technologyId: "edge-computing",
    technologyName: "Edge Computing",
    description: "Learn to build and deploy applications that run at the network edge for ultra-low latency.",
    icon: "📡",
    estimatedWeeks: 12,
    steps: [
      {
        step: 1,
        title: "IoT & Embedded Basics",
        description: "Microcontrollers, sensors, MQTT protocol, and basic edge device programming.",
        level: "Beginner",
        resources: [
          { label: "Arduino Getting Started", url: "https://www.arduino.cc/en/Guide" },
          { label: "MQTT Essentials", url: "https://www.hivemq.com/mqtt-essentials/" },
        ],
      },
      {
        step: 2,
        title: "Edge Deployment & CDN Computing",
        description: "Cloudflare Workers, Vercel Edge, Deno Deploy, and edge-native application patterns.",
        level: "Intermediate",
        resources: [
          { label: "Cloudflare Workers Docs", url: "https://developers.cloudflare.com/workers/" },
          { label: "Vercel Edge Functions", url: "https://vercel.com/docs/functions/edge-functions" },
        ],
      },
      {
        step: 3,
        title: "Edge AI & TinyML",
        description: "Deploy ML models on edge devices using TensorFlow Lite, ONNX Runtime, and edge TPUs.",
        level: "Advanced",
        resources: [
          { label: "TensorFlow Lite Guide", url: "https://www.tensorflow.org/lite/guide" },
          { label: "Edge Impulse", url: "https://docs.edgeimpulse.com/" },
        ],
      },
    ],
  },
  "ar-vr": {
    technologyId: "ar-vr",
    technologyName: "AR / VR / Spatial Computing",
    description: "Build immersive experiences for AR, VR, and spatial computing platforms.",
    icon: "🥽",
    estimatedWeeks: 14,
    steps: [
      {
        step: 1,
        title: "3D Graphics Fundamentals",
        description: "3D math, coordinate systems, shaders, and rendering pipelines.",
        level: "Beginner",
        resources: [
          { label: "Three.js Journey", url: "https://threejs-journey.com/" },
          { label: "Learn OpenGL", url: "https://learnopengl.com/" },
        ],
      },
      {
        step: 2,
        title: "Unity or Unreal Engine",
        description: "Build VR/AR experiences using Unity (C#) or Unreal Engine (C++/Blueprints).",
        level: "Intermediate",
        resources: [
          { label: "Unity Learn", url: "https://learn.unity.com/" },
          { label: "Unreal Engine Docs", url: "https://docs.unrealengine.com/" },
        ],
      },
      {
        step: 3,
        title: "WebXR & Spatial Web",
        description: "Build browser-based XR experiences with WebXR, A-Frame, and spatial computing APIs.",
        level: "Advanced",
        resources: [
          { label: "WebXR Device API", url: "https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API" },
          { label: "A-Frame Docs", url: "https://aframe.io/docs/" },
        ],
      },
    ],
  },
  "quantum": {
    technologyId: "quantum",
    technologyName: "Quantum Computing",
    description: "Understand quantum mechanics principles and learn to program quantum computers.",
    icon: "⚛️",
    estimatedWeeks: 20,
    steps: [
      {
        step: 1,
        title: "Quantum Mechanics Basics",
        description: "Superposition, entanglement, qubits, and the mathematical foundation of quantum computing.",
        level: "Beginner",
        resources: [
          { label: "IBM Quantum Learning", url: "https://learning.quantum.ibm.com/" },
          { label: "Qiskit Textbook", url: "https://github.com/Qiskit/textbook" },
        ],
      },
      {
        step: 2,
        title: "Quantum Gates & Circuits",
        description: "Build quantum circuits, understand quantum gates, and run programs on simulators.",
        level: "Intermediate",
        resources: [
          { label: "Qiskit Documentation", url: "https://docs.quantum.ibm.com/" },
          { label: "Cirq by Google", url: "https://quantumai.google/cirq" },
        ],
      },
      {
        step: 3,
        title: "Quantum Algorithms & Applications",
        description: "Shor's algorithm, Grover's search, quantum machine learning, and quantum cryptography.",
        level: "Advanced",
        resources: [
          { label: "PennyLane QML", url: "https://pennylane.ai/qml/" },
          { label: "Quantum Algorithm Zoo", url: "https://quantumalgorithmzoo.org/" },
        ],
      },
    ],
  },
  "devops": {
    technologyId: "devops",
    technologyName: "DevOps / Platform Engineering",
    description: "Build CI/CD pipelines, infrastructure as code, and internal developer platforms.",
    icon: "🔧",
    estimatedWeeks: 16,
    steps: [
      {
        step: 1,
        title: "Linux & Shell Scripting",
        description: "Linux administration, Bash scripting, cron jobs, and system monitoring.",
        level: "Beginner",
        resources: [
          { label: "Linux Journey", url: "https://linuxjourney.com/" },
          { label: "Shell Scripting Tutorial", url: "https://www.shellscript.sh/" },
        ],
      },
      {
        step: 2,
        title: "CI/CD & Version Control",
        description: "Git workflows, GitHub Actions, Jenkins, and automated testing pipelines.",
        level: "Beginner",
        resources: [
          { label: "GitHub Actions Docs", url: "https://docs.github.com/en/actions" },
          { label: "Learn Git Branching", url: "https://learngitbranching.js.org/" },
        ],
      },
      {
        step: 3,
        title: "Infrastructure as Code",
        description: "Terraform, Pulumi, Ansible — manage infrastructure declaratively and repeatably.",
        level: "Intermediate",
        resources: [
          { label: "Terraform Tutorials", url: "https://developer.hashicorp.com/terraform/tutorials" },
          { label: "Ansible Getting Started", url: "https://docs.ansible.com/ansible/latest/getting_started/" },
        ],
      },
      {
        step: 4,
        title: "Platform Engineering & IDP",
        description: "Build internal developer platforms with Backstage, golden paths, and developer portals.",
        level: "Advanced",
        resources: [
          { label: "Backstage by Spotify", url: "https://backstage.io/docs/overview/what-is-backstage" },
          { label: "Platform Engineering Guide", url: "https://platformengineering.org/" },
        ],
      },
    ],
  },
};

export function getRoadmap(technologyId: string): Roadmap | undefined {
  return roadmaps[technologyId];
}

export function getAllRoadmaps(): Roadmap[] {
  return Object.values(roadmaps);
}
