program Gestor.Financeiro.Server;

uses
  Vcl.Forms,
  uPrincipal in 'uPrincipal.pas' {frmPrincipal},
  uDm in '..\..\Global\uDm.pas' {Dm: TDataModule},
  uBase.Functions in '..\..\Global\Funcoes\uBase.Functions.pas',
  uRotas in 'uRotas.pas',
  uDataBase.Manager in 'uDataBase.Manager.pas',
  uConfig in '..\..\Descktop\src\uConfig.pas' {frmConfig},
  Vcl.Themes,
  Vcl.Styles;

{$R *.res}

begin
  Application.Initialize;
  Application.MainFormOnTaskbar := True;
  Application.CreateForm(TfrmPrincipal, frmPrincipal);
  Application.CreateForm(TfrmConfig, frmConfig);
  Application.Run;
end.
