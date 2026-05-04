Set ws = CreateObject("WScript.Shell")
Set fs = CreateObject("Scripting.FileSystemObject")

projectDir = fs.GetParentFolderName(WScript.ScriptFullName)
ws.CurrentDirectory = projectDir

' Check Node.js
ret = ws.Run("cmd /c where node >nul 2>&1", 0, True)
If ret <> 0 Then
    ws.Popup "未找到 Node.js，请先安装:" & vbCrLf & "https://nodejs.org", 10, "PC迁移助手", 48
    WScript.Quit 1
End If

' Install npm dependencies if needed
If Not fs.FolderExists(projectDir & "\node_modules") Then
    ret = ws.Run("cmd /c npm install > """ & projectDir & "\启动日志.txt"" 2>&1", 0, True)
    If ret <> 0 Then
        ws.Popup "依赖安装失败，请检查网络后重试" & vbCrLf & "详情见: 启动日志.txt", 10, "PC迁移助手", 48
        WScript.Quit 1
    End If
End If

' Download Electron if needed
If Not fs.FileExists(projectDir & "\node_modules\electron\dist\electron.exe") Then
    ret = ws.Run("cmd /c npm install electron --save-dev > """ & projectDir & "\启动日志.txt"" 2>&1", 0, True)
    If ret <> 0 Then
        ws.Popup "Electron 下载失败，请检查网络后重试", 10, "PC迁移助手", 48
        WScript.Quit 1
    End If
End If

' Clean up old log
If fs.FileExists(projectDir & "\启动日志.txt") Then fs.DeleteFile projectDir & "\启动日志.txt"

' Launch the app silently
ws.Run "cmd /c npm run dev", 0, False

WScript.Quit 0
