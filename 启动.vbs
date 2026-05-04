Set ws = CreateObject("WScript.Shell")
ws.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
ret = ws.Run("cmd /c ""启动.bat""", 0, True)
If ret <> 0 Then
    ws.Popup "启动失败 (错误码: " & ret & ")" & vbCrLf & "请确认已安装 Node.js", 10, "PC迁移助手", 48
End If
