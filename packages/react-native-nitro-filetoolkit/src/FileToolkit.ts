import { NitroModules } from 'react-native-nitro-modules'
import type { FileToolkitFactory } from './specs/FileToolkitFactory.nitro'

export const FileToolkit =
  NitroModules.createHybridObject<FileToolkitFactory>(
    'FileToolkitFactory',
  )
