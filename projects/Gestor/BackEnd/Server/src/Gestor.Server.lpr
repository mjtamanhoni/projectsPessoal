program Gestor.Server;

{$mode objfpc}{$H+}

uses
  {$IFDEF UNIX}
  cthreads,
  {$ENDIF}
  {$IFDEF HASAMIGA}
  athreads,
  {$ENDIF}
  Interfaces,
  Forms, zcomponent,
  Horse, Horse.Jhonson, Horse.CORS, Horse.JWT,
  uPrincipal, uConfig, uDm, uBase.Functions,
  uDataBase.Manager, uRotas;

{$R *.res}

begin
  RequireDerivedFormResource := True;
			Application.Scaled := True;
  {$PUSH}{$WARN 5044 OFF}
  Application.MainFormOnTaskbar := True;
  {$POP}
  Application.Initialize;
  Application.CreateForm(TForm1, Form1);
  Application.CreateForm(TForm2, Form2);
  Application.Run;
end.
