Set ws = CreateObject("WScript.Shell")
Set fs = CreateObject("Scripting.FileSystemObject")

projectDir = fs.GetParentFolderName(WScript.ScriptFullName)
ws.CurrentDirectory = projectDir

packedExe = projectDir & "\release\win-unpacked\PC迁移助手.exe"

' --- 优先使用打包版本（无需 Node.js）---
If fs.FileExists(packedExe) Then
    ws.Run """" & packedExe & """", 1, False
    WScript.Quit 0
End If

' --- 打包版本不存在，检查 Node.js ---
ret = ws.Run("cmd /c where node >nul 2>&1", 0, True)
If ret <> 0 Then
    ws.Popup "未找到打包版本，且未安装 Node.js" & vbCrLf & vbCrLf & _
             "请在开发机上运行: npm run package" & vbCrLf & _
             "然后将 release 目录复制到本机即可使用", _
             10, "PC迁移助手", 48
    WScript.Quit 1
End If

' --- 开发模式 ---
If Not fs.FolderExists(projectDir & "\node_modules") Then
    ret = ws.Run("cmd /c npm install", 0, True)
    If ret <> 0 Then
        ws.Popup "依赖安装失败，请检查网络后重试", 10, "PC迁移助手", 48
        WScript.Quit 1
    End If
End If

ws.Run "cmd /c npm run dev", 0, False
WScript.Quit 0
