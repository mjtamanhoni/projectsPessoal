param(
    [Parameter(Mandatory = $true)][string]$Raiz
)

$ErrorActionPreference = 'Stop'

$raiz = (Resolve-Path -LiteralPath $Raiz).Path
$androidDir = Join-Path $raiz 'android'
$keystore = Join-Path $androidDir 'release.keystore'
$props = Join-Path $androidDir 'keystore.properties'
$alias = 'titulos'

function Falhar([string]$mensagem) {
    Write-Host ''
    Write-Host '============================================'
    Write-Host '  FALHA ao criar a keystore.'
    Write-Host '============================================'
    Write-Host ''
    Write-Host $mensagem
    exit 1
}

Write-Host ''
Write-Host '============================================'
Write-Host '  Criar keystore de release'
Write-Host '============================================'
Write-Host ''

if (-not (Test-Path -LiteralPath $androidDir)) {
    Falhar 'Pasta android nao encontrada. Rode build-apk.bat uma vez antes.'
}

if (Test-Path -LiteralPath $keystore) {
    Write-Host '[AVISO] A keystore ja existe:'
    Write-Host "        $keystore"
    Write-Host ''
    Write-Host 'Nao vou sobrescrever. Se quiser recriar, apague o arquivo'
    Write-Host 'e o keystore.properties manualmente (somente se ainda nao publicou).'
    exit 0
}

function Resolver-JavaHome {
    if ($env:JAVA_HOME) { return $env:JAVA_HOME }

    $candidatos = @(
        (Join-Path $env:USERPROFILE '.jdks\jbr-17.0.14'),
        (Join-Path $env:LOCALAPPDATA 'Programs\Android Studio\jbr'),
        (Join-Path $env:ProgramFiles 'Android\Android Studio\jbr')
    )

    foreach ($candidato in $candidatos) {
        if ($candidato -and (Test-Path -LiteralPath (Join-Path $candidato 'bin\java.exe'))) {
            return $candidato
        }
    }
    return $null
}

$javaHome = Resolver-JavaHome
if (-not $javaHome) {
    Falhar 'JAVA_HOME nao definido e nenhum JDK 17 encontrado. Instale o Android Studio ou ajuste JAVA_HOME.'
}

$keytool = Join-Path $javaHome 'bin\keytool.exe'
if (-not (Test-Path -LiteralPath $keytool)) {
    Falhar "keytool nao encontrado em $keytool"
}

Write-Host 'Voce vai definir a senha da keystore.'
Write-Host 'Use de 8 a 64 caracteres: letras, numeros e os simbolos @ # ponto hifen'
Write-Host 'Nao use: exclamacao, porcento, acento, ampersand, barra vertical,'
Write-Host 'maior/menor, aspas, igual, dois-pontos, barra invertida ou espacos.'
Write-Host ''

$segura = Read-Host -AsSecureString 'Senha da keystore'
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($segura)
try {
    $senha = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if ($senha -notmatch '^[A-Za-z0-9@#._-]{8,64}$') {
    Falhar 'Senha invalida. Use de 8 a 64 caracteres permitidos.'
}

$segura2 = Read-Host -AsSecureString 'Confirme a senha'
$bstr2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($segura2)
try {
    $confirmacao = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr2)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr2)
}

if ($senha -ne $confirmacao) {
    Falhar 'As senhas nao conferem.'
}

Write-Host ''
Write-Host 'Gerando a keystore...'

$dname = 'CN=Titulos a Pagar Offline, OU=Mobile, O=Conesoft, L=BRASIL, ST=BR, C=BR'
$env:KW_STOREPASS = $senha
try {
    & $keytool -genkeypair -v `
        -keystore $keystore `
        -storetype PKCS12 `
        -alias $alias `
        -keyalg RSA -keysize 2048 -validity 10000 `
        -dname $dname `
        '-storepass:env' 'KW_STOREPASS'
    $codigo = $LASTEXITCODE
} finally {
    Remove-Item Env:\KW_STOREPASS -ErrorAction SilentlyContinue
}

if ($codigo -ne 0 -or -not (Test-Path -LiteralPath $keystore)) {
    Falhar 'O keytool nao conseguiu gerar a keystore.'
}

$conteudo = @(
    'storeFile=../release.keystore',
    "storePassword=$senha",
    "keyAlias=$alias",
    "keyPassword=$senha"
)
Set-Content -LiteralPath $props -Value $conteudo -Encoding ASCII

Write-Host ''
Write-Host '============================================'
Write-Host '  Keystore criada com sucesso!'
Write-Host ''
Write-Host "  Arquivo:  $keystore"
Write-Host "  Alias:    $alias"
Write-Host "  Config:   $props"
Write-Host '============================================'
Write-Host ''
Write-Host 'IMPORTANTE:'
Write-Host ' - Faca uma copia de seguranca de release.keystore e da senha.'
Write-Host ' - Esses arquivos NAO sao versionados no git.'
Write-Host ' - Perder a keystore impede atualizar o app na Play Store.'
Write-Host ''
Write-Host 'Agora rode: build-apk-release.bat'
exit 0
