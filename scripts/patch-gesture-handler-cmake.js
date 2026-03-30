/**
 * Fixes RN GH CMake when REACT_NATIVE_MINOR_VERSION is unset during reconfigure:
 * if(${REACT_NATIVE_MINOR_VERSION} GREATER_EQUAL 73) → invalid "GREATER_EQUAL" "73"
 * Run from repo root via patch-gesture-handler-cmake.sh or postinstall.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const cmake = path.join(
  root,
  'node_modules/react-native-gesture-handler/android/src/main/jni/CMakeLists.txt',
);

if (!fs.existsSync(cmake)) {
  process.exit(0);
}

let t = fs.readFileSync(cmake, 'utf8');
if (t.includes('patch-gesture-handler-cmake')) {
  process.exit(0);
}

const marker = 'if(${REACT_NATIVE_MINOR_VERSION} GREATER_EQUAL 73)';
if (!t.includes(marker)) {
  process.exit(0);
}

const rn = require(path.join(root, 'node_modules/react-native/package.json'));
const minor = parseInt(String(rn.version).split('.')[1], 10) || 81;

const oldBlock = `${marker}
    set(CMAKE_CXX_STANDARD 20)
else()
    set(CMAKE_CXX_STANDARD 17)
endif()`;

const newBlock = `# patch-gesture-handler-cmake
if(NOT DEFINED REACT_NATIVE_MINOR_VERSION OR "\${REACT_NATIVE_MINOR_VERSION}" STREQUAL "")
  set(REACT_NATIVE_MINOR_VERSION ${minor})
endif()
if(REACT_NATIVE_MINOR_VERSION GREATER_EQUAL 73)
    set(CMAKE_CXX_STANDARD 20)
else()
    set(CMAKE_CXX_STANDARD 17)
endif()`;

fs.writeFileSync(cmake, t.replace(oldBlock, newBlock));
